/*
  to run locally:
    source ./.hob/.env && node

    then

    const l = require('./lambda/heartbeat-monitor')
    l.handler().then(() => { process.exit() }) && 1
 */
module.exports.handler = async function heartbeatMonitor(/* event, context */) {
  const log = require('conjure-core/modules/log')('lambda.heartbeat-monitor')
  require('../setup')(log)

  const { query, DatabaseRow } = require('@conjurelabs/db')

  // heartbeat should only be happening when the container is being _created_
  // not while running or going down
  const flatlineResult = await query(`
    SELECT id
    FROM container
    WHERE ecs_state = 'spinning up'
    AND creation_failed IS FALSE
    AND creation_heartbeat < NOW() - INTERVAL '2 minutes'
  `)

  const rowCount = flatlineResult.rows.length

  if (!rowCount) {
    log.info('no rows are stale')
    return
  }

  log.info(`${rowCount} row${rowCount === 1 ? '' : 's'} are stale, and being set to 'failed'`)

  const batchAll = require('@conjurelabs/utils/Promise/batch-all')
  await batchAll(3, flatlineResult.rows, row => {
    return new DatabaseRow('container', row)
      .set({
        ecsState: 'failed',
        isActive: false,
        creationFailed: true,
        updated: new Date()
      })
      .save()
  })

  log.info(`update${rowCount === 1 ? '' : 's'} done`)
}
