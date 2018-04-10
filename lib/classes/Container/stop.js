const log = require('conjure-core/modules/log')('container stop')

async function containerStop() {
  log.info('stopping container')

  const { branch } = this.payload

  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord()

  const { DatabaseTable } = require('@conjurelabs/db')
  // make sure the repo/branch is in the correct state
  const runningContainerRecords = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    isActive: true,
    ecsState: 'running'
  })

  if (!runningContainerRecords.length) {
    // no container record to start back up
    return
  }

  const containerRecord = runningContainerRecords[0]

  // update db record, since spinning down
  await DatabaseTable.update('container', {
    ecsState: 'spinning down',
    updated: new Date()
  }, {
    id: containerRecord.id
  })

  log.info('stopping task')
  const stopTask = require('../../AWS/ECS/stop-task')
  await stopTask(containerRecord.clusterArn, containerRecord.taskArn)

  // update db record
  await DatabaseTable.update('container', {
    ecsState: 'stopped',
    isActive: false,
    taskArn: null,
    publicIp: null,
    activeEnd: new Date(),
    updated: new Date()
  }, {
    id: containerRecord.id
  })
}

module.exports = containerStop
