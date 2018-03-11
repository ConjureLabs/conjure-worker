const log = require('conjure-core/modules/log')('container update')
const { UnexpectedError } = require('@conjurelabs/err')

async function containerUpdate() {
  log.info('starting update')

  const { branch } = this.payload

  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord()

  const DatabaseTable = require('@conjurelabs/db/table')
  let containerRecord = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch,
    is_active: true
  })
  let oldRecord

  if (containerRecord) {
    oldRecord = containerRecord.copy()
    DatabaseTable.update('container', {
      ecs_state: 'updating',
      updated: new Date()
    }, {
      id: containerRecord.id
    })
  } else {
    containerRecord = await DatabaseTable.insert('container', {
      repo: watchedRepo.id,
      branch,
      is_active: true,
      ecs_state: 'spinning up', // this shouldn't really happen here
      active_start: new Date(),
      added: new Date()
    })
  }

  // get github client
  const repoConfig = await this.getConfig()

  // first take the time to do anything we can before stopping any old
  const containerUid = await initalTasks(watchedRepo, repoConfig)

  log.info('retrieving task definition')
  const getTaskDefinition = require('../../AWS/ECS/get-task-definition')
  let taskDefinitionRevision = await getTaskDefinition(watchedRepo)
  // if no task definition registered, create one
  if (!taskDefinitionRevision) {
    throw new UnexpectedError('Task definition missing for existing task')
  }

  log.info('running task')
  const runTask = require('../../AWS/ECS/run-task')
  const taskPending = await runTask(watchedRepo, taskDefinitionRevision)

  log.info('waiting for task to run')
  const waitForTask = require('../../AWS/ECS/wait-for-task')
  const taskRunning = await waitForTask(taskPending)
  log.info('task running, via Fargate')

  log.info('getting public ip')
  const getTaskIp = require('../../AWS/ECS/get-task-public-ip')
  const publicIp = await getTaskIp(taskRunning)

  // update record
  await DatabaseTable.update('container', {
    url_uid: containerUid,
    public_ip: publicIp,
    host_port: repoConfig.machine.port, // todo: possibly assign dynaimc port?
    cluster_arn: taskRunning.clusterArn,
    task_arn: taskRunning.taskArn,
    task_definition_arn: taskRunning.taskDefinitionArn,
    ecs_state: 'running',
    updated: new Date()
  }, {
    id: containerRecord.id
  })

  // should _always_ have an old record, but safe > sorry
  if (oldRecord) {
    log.info('stopping old task')
    const stopTask = require('../../AWS/ECS/stop-task')
    await stopTask(oldRecord.cluster_arn, oldRecord.task_arn)
  }
}

/*
  handles any 'inital' tasks,
  meaning anything that has possible wait-time, and can be done
  before stopping any running tasks
  (this will help avoid dead-time of container cutover)
 */
function initalTasks(watchedRepo, repoConfig) {
  return new Promise(async resolve => {
    // build docker file
    const containerUid = await this.dockerBuild()

    // getting, and creating if needed, the ecr repo path in aws
    log.info('getting ECR repo record')

    const pushDockerBuild = require('../../AWS/ECR/push-docker-build')
    const path = require('path')
    await pushDockerBuild(watchedRepo, path.resolve(__dirname, '..', '..', 'git-container'))

    // checking if task definition is registered already
    log.info('checking for task definition')
    const getTaskDefinition = require('../../AWS/ECS/get-task-definition')
    let taskDefinitionRevision = await getTaskDefinition(watchedRepo)
    // if no task definition registered, create one
    if (!taskDefinitionRevision) {
      log.info('no task definition - creating one')
      const registerTaskDefinition = require('../../AWS/ECS/register-task-definition')
      taskDefinitionRevision = await registerTaskDefinition(watchedRepo, repoConfig)
    } else {
      log.info('task definition found')
    }

    // getting cluster info, in case it already exists
    log.info('checking for cluster')
    const getClusterData = require('../../AWS/ECS/get-cluster-data')
    let cluster = await getClusterData(watchedRepo)
    // if no cluster, then create one
    if (!cluster) {
      log.info('no cluster found - creating one')
      const createCluster = require('../../AWS/ECS/create-cluster')
      cluster = await createCluster(watchedRepo)
    } else {
      log.info('cluster found')
    }

    resolve(containerUid)
  })
}

module.exports = containerUpdate
