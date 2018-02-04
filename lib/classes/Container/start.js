const log = require('conjure-core/modules/log')('container start');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: config.aws.accessKey,
  secretAccessKey: config.aws.secretKey,
  region: config.aws.default.region
});

async function containerStart() {
  log.info('starting container');

  const { branch } = this.payload;

  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord();

  const DatabaseTable = require('db/table');
  // make sure the repo/branch is in the correct state
  const idleContainerRecords = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    is_active: true,
    ecs_state: 'stopped'
  });

  if (!idleContainerRecords.length) {
    // no container record to start back up
    return;
  }

  const containerRecord = idleContainerRecords[0];

  await startTask(containerRecord);



  // // remove db reference to proxy
  // await DatabaseTable.update('container', {
  //   is_active: false,
  //   active_stop: new Date(),
  //   updated: new Date()
  // }, {
  //   repo: watchedRepo.id,
  //   branch: branch,
  //   is_active: true
  // });
}

function startTask(containerRecord) {
  return new Promise((resolve, reject) => {
    const param = {
      cluster: containerRecord.cluster_arn,
      taskDefinition: containerRecord.task_definition_arn,
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#startTask-property
    ecs.startTask(param, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
}

module.exports = containerStart;
