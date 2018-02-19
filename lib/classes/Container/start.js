const { UnexpectedError } = require('err');
const log = require('conjure-core/modules/log')('container start');

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

  if (!stoppedContainerRecords.length) {
    // no container record to start back up - so create one
    return this.create();
  }

  const containerRecord = stoppedContainerRecords[0];

  // update db record, since spinning up
  await DatabaseTable.update('container', {
    ecs_state: 'spinning up',
    is_active: true,
    updated: new Date()
  }, {
    id: containerRecord.id
  });

  log.info('retrieving task definition');
  const getTaskDefinition = require('../../AWS/ECS/get-task-definition');
  let taskDefinitionRevision = await getTaskDefinition(watchedRepo);
  // if no task definition registered, create one
  if (!taskDefinitionRevision) {
    throw new UnexpectedError('Task definition missing for existing task');
  }

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

module.exports = containerStart;
