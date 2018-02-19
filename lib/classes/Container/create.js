const { ContentError, UnexpectedError } = require('err');
const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('container create');

let workerPort = parseInt(process.env.CONJURE_CONTAINER_STARTING_PORT, 10);

async function containerCreate() {
  log.info('starting create');

  const {
    branch,
    orgName,
    repoName
  } = this.payload;
  
  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord();

  // make sure the repo/branch is not already in progress
  const DatabaseTable = require('db/table');
  const duplicateActiveContainers = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch,
    is_active: true
  });
  if (duplicateActiveContainers.length) {
    return duplicateActiveContainers[0].url_uid;
  }

  // get github client
  const repoConfig = await this.getConfig();

  // create record for container
  const insertedContainer = await DatabaseTable.insert('container', {
    repo: watchedRepo.id,
    branch,
    is_active: true,
    ecs_state: 'spinning up',
    active_start: new Date(),
    added: new Date()
  });

  if (!Array.isArray(insertedContainer) || !insertedContainer.length) {
    throw UnexpectedError('Container record failed to insert');
  }

  const containerRowId = insertedContainer[0].id;

  const containerUid = await this.dockerBuild();

  const fargateResponse = await spinUpProject(watchedRepo, repoConfig);

  // update reference for container
  await DatabaseTable.update('container', {
    url_uid: containerUid,
    public_ip: fargateResponse.publicIp,
    host_port: fargateResponse.hostPort,
    cluster_arn: fargateResponse.clusterArn,
    task_arn: fargateResponse.taskArn,
    task_definition_arn: fargateResponse.taskDefinitionArn,
    is_active: true,
    ecs_state: 'running',
    updated: new Date()
  }, {
    id: containerRowId
  });

  return containerUid;
}

/*
  spins up a project on AWS, via ECS/ECR/Fargate
  1. register ECR repo, so we can docker push into it
  2. docker push into ECR
  3. register ECS task definition for this repo
  4. create ECS cluster for this repo
  5. run ECS task, based on definition, within the created cluster
 */
function spinUpProject(watchedRepo, repoConfig) {
  return new Promise(async (resolve, reject) => {
    // getting, and creating if needed, the ecr repo path in aws
    log.info('getting ECR repo record');
    const getEcrRepoRecord = require('./common/get-ecr-repo-record');
    const ecrRepoRecord = await getEcrRepoRecord(watchedRepo);

    const pushDockerBuild = require('../../AWS/ECR/push-docker-build');
    await pushDockerBuild(watchedRepo, path.resolve(__dirname, '..', '..', 'git-container'));

    // checking if task definition is registered already
    log.info('checking for task definition');
    const getTaskDefinition = require('../../AWS/ECS/get-task-definition');
    let taskDefinitionRevision = await getTaskDefinition(watchedRepo);
    // if no task definition registered, create one
    if (!taskDefinitionRevision) {
      log.info('no task definition - creating one')
      const registerTaskDefinition = require('../../AWS/ECS/register-task-definition');
      taskDefinitionRevision = await registerTaskDefinition(watchedRepo, repoConfig);
    } else {
      log.info('task definition found');
    }

    // getting cluster info, in case it already exists
    log.info('checking for cluster');
    const getClusterData = require('../../AWS/ECS/get-cluster-data');
    let cluster = await getClusterData(watchedRepo);
    // if no cluster, then create one
    if (!cluster) {
      log.info('no cluster found - creating one');
      const createCluster = require('../../AWS/ECS/create-cluster');
      cluster = await createCluster(watchedRepo);
    } else {
      log.info('cluster found');
    }

    // run the task, in the cluster
    log.info('running task');
    const runTask = require('../../AWS/ECS/run-task');
    const taskPending = await runTask(watchedRepo, taskDefinitionRevision);

    log.info('waiting for task to run');
    const waitForTask = require('../../AWS/ECS/wait-for-task');
    const taskRunning = await waitForTask(taskPending);
    log.info('task running, via Fargate');

    log.info('getting public ip');
    const getTaskIp = require('../../AWS/ECS/get-task-public-ip');
    const publicIp = await getTaskIp(taskRunning);

    resolve({
      hostPort: repoConfig.machine.port, // todo: possibly assign dynaimc port?
      clusterArn: taskRunning.clusterArn,
      taskArn: taskRunning.taskArn,
      taskDefinitionArn: taskRunning.taskDefinitionArn,
      publicIp
    });
  });
}

module.exports = containerCreate;
