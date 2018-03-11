const config = require('conjure-core/modules/config')
const log = require('conjure-core/modules/log')('docker push to ecr')

module.exports = function pushDockerBuild(watchedRepoRecord /*, workingDir */) {
  return new Promise(async resolve => {
    // pushing docker build to ecr
    log.info('logging into docker (for ECR push)')
    await dockerLogin() // first need to ensure docker is logged into ecr
    log.info('docker push (to ECR)')
    await pushProject(watchedRepoRecord)
    resolve()
  })
}

function dockerLogin(workingDir) {
  const command = `eval $(XYZ=$(aws ecr get-login --region us-east-1) && printf '%s\\n' "$\{XYZ// -e none/}")`
  return exec(command, workingDir, (err, resolve, reject) => {
    if (!err.message || !err.message.includes('WARNING! Using --password via the CLI is insecure.')) {
      return reject(err)
    }
    resolve()
  })
}

function pushProject(watchedRepoRecord, workingDir) {
  const getResourceName = require('../ECS/get-resource-name')
  const resourceName = getResourceName(watchedRepoRecord)
  const builtDockerName = `conjure/${resourceName}`
  const ecrReposUrl = `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`

  const command = `docker push "${ecrReposUrl}${builtDockerName}:latest"`

  return exec(command, workingDir)
}

function defaultExecErrorHandler(err, resolve, reject) {
  reject(err)
}

function exec(command, workingDir, onErr = defaultExecErrorHandler) {
  return new Promise(async (resolve, reject) => {
    const exec = require('conjure-core/modules/childProcess/exec')

    if (process.env.NODE_ENV === 'development') {
      log.info(command)
    }

    try {
      await exec(command, {
        cwd: workingDir
      })
    } catch(err) {
      return onErr(err, resolve, reject)
    }

    resolve()
  })
}
