const { query } = require('@conjurelabs/db')

const log = require('conjure-core/modules/log')('lambda.heartbeat-monitor')

(async function() {
  // heartbeat should only be happening when the container is being _created_
  // not while running or going down
  const now = new Date()
  const flatlineResult = await query(`
    SELECT id
    FROM container
    WHERE ecs_state IN ('spinning up', 'updating')
    AND creation_heartbeat < $1 - INTERVAL '2 minutes'
  `, [now])

  const rowCount = flatlineResult.rows.length

  if (!rowCount) {
    return
  }

  log.info(`${rowCount} row${rowCount === 1 ? '' : 's'} are stale, and being set to 'failed'`)

  const batchAll = require('@conjurelabs/utils/Promise/batch-all')
  await batchAll(3, flatlineResult.rows, row => {
    return row
      .set({
        ecsState: 'failed',
        isActive: false,
        updated: new Date()
      })
      .save()
  })

  log.info(`update${rowCount === 1 ? '' : 's'} done`)
})()
