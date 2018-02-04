const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('docker push to ecr');

module.exports = function(watchedRepo, workingDir) {
  return new Promise(async (resolve, reject) => {
    // pushing docker build to ecr
    log.info('logging into docker (for ECR push)');
    await dockerLogin(); // first need to ensure docker is logged into ecr
    log.info('docker push (to ECR)');
    await pushProject(watchedRepo);
    resolve();
  });
};

function dockerLogin(workingDir) {
  const command = `eval $(XYZ=$(aws ecr get-login --region us-east-1) && printf '%s\\n' "$\{XYZ// -e none/}")`;
  return exec(command, workingDir, (err, resolve, reject) => {
    if (!err.message || !err.message.includes('WARNING! Using --password via the CLI is insecure.')) {
      return reject(err);
    }
    resolve();
  });
}

function pushProject(watchedRepo, workingDir) {
  const fargatePrefix = require('../ECS/fargate-prefix');
  const builtDockerName = `conjure/${fargatePrefix}${watchedRepo.id}`;
  const ecrReposUrl = `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`;

  const command = `docker push "${ecrReposUrl}${builtDockerName}:latest"`;

  return exec(command, workingDir);
}

function defaultExecErrorHandler(err, resolve, reject) {
  reject(err);
}

function exec(command, workingDir, onErr = defaultExecErrorHandler) {
  return new Promise(async (resolve, reject) => {
    const exec = require('conjure-core/modules/childProcess/exec');
    const path = require('path');

    if (process.env.NODE_ENV === 'development') {
      log.info(command);
    }

    let stdout;

    try {
      stdout = await exec(command, {
        cwd: workingDir
      });
    } catch(err) {
      return onErr(err, resolve, reject);
    }

    resolve();
  });
}
