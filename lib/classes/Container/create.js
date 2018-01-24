const { ContentError, UnexpectedError } = require('conjure-core/modules/err');
const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('container create');
const AWS = require('aws-sdk');

let workerPort = parseInt(process.env.CONJURE_CONTAINER_STARTING_PORT, 10);

AWS.config.update({
  accessKeyId: config.aws.accessKey,
  secretAccessKey: config.aws.secretKey,
  region: config.aws.default.region
});

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

  // make sure the repo/branch is not already spun up
  const DatabaseTable = require('conjure-core/classes/DatabaseTable');
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
  await spinUpProject(watchedRepo, repoConfig);

  // const { containerId, hostPort } = await runProject(repoConfig, containerUid);

  // // update reference for container
  // await DatabaseTable.update('container', {
  //   domain: `c${containerUid}.${config.app.web.domain}`,
  //   port: hostPort,
  //   container_id: containerId,
  //   is_active: true,
  //   active_start: new Date(),
  //   updated: new Date()
  // }, {
  //   id: containerRowId
  // });

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
          const UnexpectedError = require('conjure-core/modules/err').UnexpectedError;
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
      `conjure/watched-${watchedRepoId}`,
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
        const UnexpectedError = require('conjure-core/modules/err').UnexpectedError;
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
    const ecrRepoRecord = await getEcrRepoRecord(watchedRepo);

    // pushing docker build to ecr
    await dockerLogin(); // first need to ensure docker is logged into ecr
    await pushProject(watchedRepo);

    // checking if task definition is registered already
    let taskDefinitionRevision = ecsRetrieveTaskDefinition(watchedRepo);
    // if no task definition registered, create one
    if (!taskDefinitionRevision) {
      taskDefinitionRevision = await ecsRegisterTaskDefinition(watchedRepo, repoConfig);
    }

    // getting cluster info, in case it already exists
    let cluster = await ecsRetrieveCluster(watchedRepo);
    // if no cluster, then create one
    if (!cluster) {
      cluster = await ecsCreateCluster(watchedRepo);
    }

    // run the task, in the cluster
    const task = await ecsRunTask(watchedRepo, taskDefinitionRevision);
  });
}

function getEcrRepoRecord(watchedRepo) {
  return new Promise(async (resolve, reject) => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    const exec = require('conjure-core/modules/childProcess/exec');
    const ecrRepoRecords = await DatabaseTable.select('ecr_repo', {
      watched_repo_id: watchedRepo.id
    });

    let ecrRepoRecord;

    if (ecrRepoRecords.length > 0) {
      ecrRepoRecord = ecrRepoRecords[1];
      return resolve(ecrRepoRecord);
    } else {
      const ecr = new AWS.ECR();

      // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECR.html#createRepository-property
      ecr.createRepository({
        repositoryName: `conjure/watched-${watchedRepo.id}`
      }, async (err, data) => {
        if (err) {
          return reject(err);
        }

        ecrRepoRecord = await DatabaseTable.insert('ecr_repo', {
          watched_repo_id: watchedRepo.id,
          name: data.repository.repositoryName,
          added: new Date()
        });

        resolve(ecrRepoRecord);
      });
    }
  });
}

function dockerLogin() {
  return new Promise(async (resolve, reject) => {
    const exec = require('conjure-core/modules/childProcess/exec');
    const path = require('path');

    const command = `eval $(XYZ=$(aws ecr get-login --region us-east-1) && printf '%s\\n' "$\{XYZ// -e none/}")`;

    if (process.env.NODE_ENV === 'development') {
      log.info(command);
    }

    let stdout;

    try {
      stdout = await exec(command, {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      });
    } catch(runErr) {
      return reject(runErr);
    }

    resolve();
  });
}

function pushProject(watchedRepo) {
  const builtDockerName = `conjure/watched-${watchedRepo.id}`;
  const ecrReposUrl = `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`;

  return new Promise(async (resolve, reject) => {
    const exec = require('conjure-core/modules/childProcess/exec');
    const path = require('path');

    const command = `docker push "${ecrReposUrl}${builtDockerName}:latest"`;

    if (process.env.NODE_ENV === 'development') {
      log.info(command);
    }

    let stdout;

    try {
      stdout = await exec(command, {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      });
    } catch(runErr) {
      return reject(runErr);
    }

    resolve();
  });
}

function ecsRetrieveTaskDefinition(watchedRepo) {
  const builtDockerName = `conjure/watched-${watchedRepo.id}`;

  return new Promise((resolve, reject) => {
    const taskListParam = {
      familyPrefix: builtDockerName
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#listTaskDefinitions-property
    ecs.listTaskDefinitions(familyPrefix, (err, data) => {
      if (err) {
        return reject(err);
      }

      if (Array.isArray(data.taskDefinitionArns) && data.taskDefinitionArns.length) {
        const revision = taskDefinitionArns[ taskDefinitionArns.length - 1].split(':').pop();
        return resolve(revision);
      }

      resolve();
    });
  });
}

function ecsRegisterTaskDefinition(watchedRepo, repoConfig) {
  const builtDockerName = `conjure/watched-${watchedRepo.id}`;
  const ecrReposUrl = `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`;

  return new Promise((resolve, reject) => {
    const taskParam = {
      containerDefinitions: [{
        entrypoint: ['bash'],
        command: ['./.conjure/.support/entrypoint.sh'],
        portMappings: [{
          protocol: 'tcp',
          hostPort: repoConfig.machine.port,
          containerPort: repoConfig.machine.port
        }],
        workingDirectory: '/var/conjure/code/',
        image: `${ecrReposUrl}${builtDockerName}:latest`,
        name: `${builtDockerName}:latest`
      }],
      memory: 512,
      cpu: 256,
      executionRoleArn: config.aws.arn.ecs.executionRole,
      taskRoleArn: config.aws.arn.ecs.taskRole,
      compatibilities: ['EC2', 'FARGATE'],
      requiresCompatibilities: ['FARGATE'],
      family: `watched-${watchedRepo.id}`,
      networkMode: 'awsvpc'
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#registerTaskDefinition-property
    ecs.registerTaskDefinition(taskParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.taskDefinition.revision);
    });
  });
}

function ecsRetrieveCluster(repoConfig) {
  return new Promise((resolve, reject) => {
    const clusterParam = {
      clusters: [`watched-${watchedRepo.id}`]
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#describeClusters-property
    ecs.describeClusters(clusterParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      
      if (Array.isArray(data.clusters) && data.clusters.length) {
        return resolve(data.clusters[0]);
      }

      resolve();
    });
  });
}

function ecsCreateCluster(repoConfig) {
  return new Promise((resolve, reject) => {
    const clusterParam = {
      clusterName: `watched-${watchedRepo.id}`
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#createCluster-property
    ecs.createCluster(clusterParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

function ecsRunTask(repoConfig, taskDefinitionRevision) {
  return new Promise((resolve, reject) => {
    const taskParam = {
      cluster: `watched-${watchedRepo.id}`,
      taskDefinition: `conjure/watched-${watchedRepo.id}:${taskDefinitionRevision}`
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#createCluster-property
    ecs.runTask(taskParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

function runProject(repoConfig, containerUid) {
  return new Promise(async (resolve, reject) => {
    const exec = require('conjure-core/modules/childProcess/exec');

    const hostPort = workerPort++;

    const extraEnvKeys = Object.keys(repoConfig.machine.environment);
    const extraEnvVars = !extraEnvKeys.length ? '' : extraEnvKeys
      .map(key => {
        return ` -e ${key}="${repoConfig.machine.environment[key]}"`;
      })
      .join('');

    const path = require('path');
    const command = `docker run --cidfile /tmp/${containerUid}.cid -i -t -d -p ${hostPort}:${repoConfig.machine.port}${extraEnvVars} "${containerUid}" ${repoConfig.machine.start}`;

    if (process.env.NODE_ENV === 'development') {
      log.info(command);
    }

    let stdout;

    try {
      stdout = await exec(command, {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      });
    } catch(runErr) {
      try {
        await exec(`rm /tmp/${containerUid}.cid`);
      } catch(rmCidErr) {
        log.error(rmCidErr);

        if (runErr.message && runErr.message.includes('port is already allocated')) {
          log.info('port is already allocated - attempting again');
          let recursiveRunResults;
          try {
            recursiveRunResults = await runProject(repoConfig, containerUid);
          } catch (err) {
            return reject(err);
          }
          return resolve(recursiveRunResults);
        }

        return reject(runErr);
      }
    }

    resolve({
      hostPort,
      containerId: stdout
    });
  });
}

module.exports = containerCreate;
