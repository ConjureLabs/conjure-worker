const log = require('conjure-core/modules/log')('container stop');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: config.aws.accessKey,
  secretAccessKey: config.aws.secretKey,
  region: config.aws.default.region
});

async function containerStop() {
  log.info('stopping container');

  const { branch } = this.payload;

  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord();

  const DatabaseTable = require('db/table');
  // make sure the repo/branch is in the correct state
  const runningContainerRecords = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    is_active: true,
    ecs_state: 'running'
  });

  if (!runningContainerRecords.length) {
    // no container record to start back up
    return;
  }

  const containerRecord = runningContainerRecords[0];

  // update db reference, since spinning down
  await DatabaseTable.update('container', {
    ecs_state: 'spinning down',
    updated: new Date()
  }, {
    id: containerRecord.id
  });

  await stopTask(containerRecord);

  // update db reference
  await DatabaseTable.update('container', {
    ecs_state: 'stopped',
    is_active: false,
    updated: new Date()
  }, {
    id: containerRecord.id
  });
}

function stopTask(containerRecord) {
  return new Promise((resolve, reject) => {
    const param = {
      cluster: containerRecord.cluster_arn,
      task: containerRecord.task_arn,
      reason: 'stopped via Conjure worker'
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#stopTask-property
    ecs.startTask(param, err => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
}

module.exports = containerStop;
