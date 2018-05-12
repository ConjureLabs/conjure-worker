/*
  local run:
    source ./.hob/.env && node ./lambda/heartbeat-monitor
 */

require('@conjurelabs/utils/process/handle-exceptions')

const { init, query, DatabaseRow } = require('@conjurelabs/db')
const config = require('conjure-core/modules/config')
const log = require('conjure-core/modules/log')('lambda.heartbeat-monitor')

// configure db connection
init(config.database.pg, {
  transformCamelCase: true
}, (sql, args) => {
  log.dev.info(sql, process.env.NODE_ENV === 'production' && args ? '---REDACTED---' : args)
})

async function heartbeatMonitor() {
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

heartbeatMonitor().then(process.exit)
