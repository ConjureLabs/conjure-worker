const Queue = require('conjure-core/classes/Queue')
const log = require('conjure-core/modules/log')('container.validate-heartbeats')

const queue = new Queue('container.validate-heartbeats', true)

queue.subscribe(async (jobData, done) => {
  // do not care about jobData
  const { query } = require('@conjurelabs/db')

  const containerResult = await query(`
    SELECT * FROM container
    WHERE (
      is_active = true
      OR ecs_state = 'pending'
    )
    AND creation_failed = FALSE
  `)

  // currently containers are expected to heartbeat every 1 min
  // we will consider a stale record to be at 2 min
  const now = new Date()
  for (containerRow of containerResult.rows) {
    if (now - containerRow.creationHeartbeat >= 2 * 60 * 1000) {
      await containerRow
        .set({
          creationFailed: true
        })
        .save()
    }
  }

  log.info(`marked all failed creations`)
  done()
})
