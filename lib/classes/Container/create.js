const { ContentError, UnexpectedError } = require('err');
const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('container create');

let workerPort = parseInt(process.env.CONJURE_CONTAINER_STARTING_PORT, 10);
const fargatePrefix = `${process.env.NODE_ENV}-watched-`;

async function containerCreate() {
  log.info('starting create');

  const {
    branch,
    orgName,
    repoName
  } = this.payload;

  const uid = require('uid');

  const containerUid = uid(24);
  
  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord();

  // make sure the repo/branch is not already in progress
  const DatabaseTable = require('db/table');
  const duplicateActiveContainers = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    is_active: true
  });
  if (duplicateActiveContainers.length) {
    return containerUid;
  }

  // get github client
  const gitHubAccount = await this.payload.getGitHubAccount();
  if (!gitHubAccount) {
    throw new ContentError('No github account record found');
  }
  const github = require('octonode');
  const gitHubClient = github.client(gitHubAccount.access_token);

  // get yml config
  const repoConfig = await getProjectYml(gitHubClient, orgName, repoName, branch);

  if (repoConfig.machine.start == undefined) {
    throw new ContentError('No container start command defined or known');
  }

  if (repoConfig.machine.port == undefined) {
    throw new ContentError('No container port defined');
  }

  // create record for container
  const insertedContainer = await DatabaseTable.insert('container', {
    repo: watchedRepo.id,
    branch: branch,
    url_uid: containerUid,
    is_active: true,
    ecs_state: 'spinning up',
    added: new Date()
  });

  if (!Array.isArray(insertedContainer) || !insertedContainer.length) {
    throw UnexpectedError('Container record failed to insert');
  }

  const containerRowId = insertedContainer[0].id;

  // create dockerfile from templates
  const languages = repoConfig.machine.languages;
  const languageNames = Object.keys(languages);

  // todo: need to handle if the user enters a version we do not support
  const templatesNeeded = languageNames.reduce((templates, languageName) => {
    templates.push(`/${languageName}/${languageName}-${languages[languageName].version}`);
    return templates;
  }, ['base']);

  const dockerfileTemplateName = await buildDockerfileTemplate(templatesNeeded);

  // create container
  // todo: handle non-github repos

  let preSetupSteps = '';

  if (repoConfig.machine.pre.length) {
    preSetupSteps = repoConfig.machine.pre
      .map(command => {
        return `RUN ${command}`;
      })
      .join('\n');
    preSetupSteps = new Buffer(preSetupSteps).toString('base64');
  }

  await buildProject(gitHubAccount.access_token, 1, orgName, repoName, branch, containerUid, dockerfileTemplateName, preSetupSteps, repoConfig.machine.setup, repoConfig.machine.start);
  const fargateResponse = await spinUpProject(watchedRepo, repoConfig);

  // update reference for container
  await DatabaseTable.update('container', {
    public_ip: fargateResponse.publicIp,
    host_port: fargateResponse.hostPort,
    cluster_arn: fargateResponse.clusterArn,
    task_arn: fargateResponse.taskArn,
    task_definition_arn: fargateResponse.taskDefinitionArn,
    is_active: true,
    ecs_state: 'running',
    active_start: new Date(),
    updated: new Date()
  }, {
    id: containerRowId
  });

  return containerUid;
}

function getProjectYml(gitHubClient, orgName, repoName, branch) {
  return new Promise((resolve, reject) => {
    gitHubClient
      .repo(`${orgName}/${repoName}`)
      .contents('.conjure/config.yml', branch, (err, file) => {
        if (
          (err && err.message === 'Not Found') ||
          (!file || file.type !== 'file' || typeof file.content !== 'string')
        ) {
          return reject(new ContentError('No Conjure YML config present in repo'));
        }

        if (err) {
          return reject(err);
        }

        const yml = new Buffer(file.content, 'base64');
        const Config = require('conjure-core/classes/Repo/Config');
        const ymlContent = new Config(yml);

        if (ymlContent.valid === false) {
          return reject(new ContentError('Invalid Conjure YML config'));
        }

        resolve(ymlContent);
      });
  });
}

function buildDockerfileTemplate(templatesNeeded) {
  return new Promise((resolve, reject) => {
    // for each template dockerfile we need to generate (that will be a `FROM ...` at top of the project dockerfile) we need to build it
    function buildTemplatePart(lastTemplateSubname) {
      const current = templatesNeeded.shift();
      const fromTemplate = arguments.length > 0 ? `conjure:${lastTemplateSubname}` : '';

      if (current === undefined) {
        return resolve(fromTemplate);
      }

      // `conjure:base` will _always_ be the first generated
      // `conjure:node-v8` is an example of the next in line ('base' is removed from template name, to be clear)
      // `conjure:node-v8_____java-oracle-java-8` is what another build would look like (would include node & java)
      const newTemplateSubname = arguments.length === 0 ? 'base' :
        lastTemplateSubname === 'base' ? current.split('/').pop() :
        `${lastTemplateSubname}_____${current.split('/').pop()}`; // _s used to signify a chain of languages

      const templateName = `conjure:${newTemplateSubname}`;

      const path = require('path');
      const command = [
        'bash',
        './build/dockerfile-template.sh',
        `${current}.Dockerfile`,
        `${templateName}`,
        `${fromTemplate}`
      ];

      if (process.env.NODE_ENV === 'development') {
        log.info(command.join(' '));
      }

      const spawn = require('child_process').spawn;
      const buildTemplate = spawn(command[0], command.slice(1), {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      });

      if (process.env.NODE_ENV === 'development') {
        buildTemplate.stdout.on('data', data => {
          console.log(data.toString());
        });

        buildTemplate.stderr.on('data', data => {
          console.log(data.toString());
        });
      }

      buildTemplate.on('exit', code => {
        if (code !== 0) {
          const UnexpectedError = require('err').UnexpectedError;
          return reject(new UnexpectedError(`Build template script exited with code ${code}`));
        }

        buildTemplatePart(newTemplateSubname);
      });
    }
    buildTemplatePart();
  });
}

function buildProject(gitHubToken, watchedRepoId, orgName, repoName, branch, containerUid, templateName, preSetupSteps, machineSetup = ':' /* : is bash noOp */, startCommand = 'exit 1' /* exit w/ error if no start given */) {
  return new Promise((resolve, reject) => {
    const path = require('path');
    const command = [
      'bash',
      './build/project.sh',
      templateName,
      `https://${gitHubToken}:x-oauth-basic@github.com/${orgName}/${repoName}.git`,
      branch,
      containerUid,
      `conjure/${fargatePrefix}${watchedRepoId}`,
      `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`,
      // `${containerUid}`,
      preSetupSteps,
      machineSetup,
      startCommand
    ];

    if (process.env.NODE_ENV === 'development') {
      log.info(command.join(' '));
    }

    const spawn = require('child_process').spawn;
    const buildProjectProcess = spawn(command[0], command.slice(1), {
      cwd: path.resolve(__dirname, '..', '..', 'git-container')
    });

    if (process.env.NODE_ENV === 'development') {
      buildProjectProcess.stdout.on('data', data => {
        console.log(data.toString());
      });

      buildProjectProcess.stderr.on('data', data => {
        console.log(data.toString());
      });
    }

    buildProjectProcess.on('exit', code => {
      if (code !== 0) {
        const UnexpectedError = require('err').UnexpectedError;
        return reject(new UnexpectedError(`Build project script exited with code ${code}`));
      }

      resolve();
    });
  });
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

// if ecr repo exists, gets it - otherwise will create it
function getEcrRepoRecord(watchedRepo) {
  return new Promise(async (resolve, reject) => {
    const DatabaseTable = require('db/table');
    const exec = require('conjure-core/modules/childProcess/exec');
    const ecrRepoRecords = await DatabaseTable.select('ecr_repo', {
      watched_repo_id: watchedRepo.id
    });

    let ecrRepoRecord;

    if (ecrRepoRecords.length > 0) {
      ecrRepoRecord = ecrRepoRecords[1];
      return resolve(ecrRepoRecord);
    } else {
      const createRepo = require('../../AWS/ECR/create-repo');
      await createRepo(watchedRepo);

      ecrRepoRecord = await DatabaseTable.insert('ecr_repo', {
        watched_repo_id: watchedRepo.id,
        name: repoName,
        added: new Date()
      });
    }
  });
}

module.exports = containerCreate;
