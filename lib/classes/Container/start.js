const log = require('conjure-core/modules/log')('container start');
const AWS = require('aws-sdk');

// todo: remove a duplication of logic that is also in create.js

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
  const stoppedContainerRecords = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    is_active: false,
    ecs_state: 'stopped'
  });

  if (!idleContainerRecords.length) {
    // no container record to start back up
    return;
  }

  const containerRecord = idleContainerRecords[0];

  // update db record, since spinning up
  await DatabaseTable.update('container', {
    ecs_state: 'spinning up',
    is_active: true,
    updated: new Date()
  }, {
    id: containerRecord.id
  });

  log.info('running task');
  const taskPending = await ecsRunTask(containerRecord);

  log.info('waiting for task to run');
  const taskRunning = await ecsWaitForTask(taskPending);
  log.info('task running, via Fargate');

  log.info('getting public ip');
  const publicIp = await getPublicIpForTask(taskRunning);

  // update db record
  await DatabaseTable.update('container', {
    ecs_state: 'running',
    task_arn: taskArn.taskArn,
    public_ip: publicIp,
    updated: new Date()
  }, {
    id: containerRecord.id
  });
}

function ecsRunTask(containerRecord) {
  return new Promise((resolve, reject) => {
    const param = {
      cluster: containerRecord.cluster_arn,
      taskDefinition: containerRecord.task_definition_arn,
      launchType: 'FARGATE',
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: 'ENABLED',
          subnets: ['subnet-315dbc1e'], // todo: config? pull down?
          // conjure-fargate-instance-security-group
          securityGroups: ['sg-bc61abcb'] // todo: config? pull down?
        }
      }
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#runTask-property
    ecs.runTask(param, (err, data) => {
      if (err) {
        return reject(err);
      }
      if (!data || !Array.isArray(data.tasks) || !data.tasks[0]) {
        return reject(new UnexpectedError('runTask returned invalid data'));
      }
      resolve(data.tasks[0]);
    });
  });
}

function ecsWaitForTask(task) {
  return new Promise((resolve, reject) => {
    const param = {
      cluster: task.clusterArn,
      tasks: [ task.taskArn ]
    };

    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#waitFor-property
    ecs.waitFor('tasksRunning', param, (err, data) => {
      if (err) {
        return reject(err);
      }
      if (!data || !Array.isArray(data.tasks) || !data.tasks[0]) {
        return reject(new UnexpectedError('runTask returned invalid data'));
      }
      resolve(data.tasks[0]);
    });
  });
}

function getPublicIpForTask(task) {
  return new Promise((resolve, reject) => {
    if (
      !task ||
      !Array.isArray(task.attachments) ||
      !task.attachments.length ||
      !Array.isArray(task.attachments[0].details)
    ) {
      return reject(new UnexpectedError('task given does not have listed attachments'));
    }

    let eni;
    for (let i = 0; i < task.attachments[0].details.length; i++) {
      if (task.attachments[0].details[i].name === 'networkInterfaceId') {
        eni = task.attachments[0].details[i].value;
        break;
      }
    }

    if (typeof eni !== 'string') {
      return reject(new UnexpectedError('task given does not have a listed network interface Id'));
    }

    const param = {
      NetworkInterfaceIds: [eni]
    };

    const ec2 = new AWS.EC2();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeNetworkInterfaces-property
    ec2.describeNetworkInterfaces(param, (err, data) => {
      if (err) {
        return reject(err);
      }
      if (
        !data ||
        !Array.isArray(data.NetworkInterfaces) ||
        !data.NetworkInterfaces.length ||
        !data.NetworkInterfaces[0].Association ||
        !data.NetworkInterfaces[0].Association.PublicIp
      ) {
        return reject(new UnexpectedError('describeNetworkInterfaces returned invalid data'));
      }
      resolve(data.NetworkInterfaces[0].Association.PublicIp);
    });
  });
}

module.exports = containerStart;
