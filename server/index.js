// first running any synchronous setup
require('./setup')

require('@conjurelabs/utils/process/handle-exceptions')

const config = require('conjure-core/modules/config')
const log = require('conjure-core/modules/log')()

// configure db connection
require('@conjurelabs/db').init(config.database.pg, (sql, args) => {
  log.dev.info(sql, process.env.NODE_ENV === 'production' && args ? '---REDACTED---' : args)
})

// triggering mq to connect
const Queue = require('conjure-core/classes/Queue')

let activatedWorkerNotation = process.env.CONJURE_WORKER_NOTATION

if (activatedWorkerNotation === undefined) {
  if (process.env.NODE_ENV === 'development') {
    log.info('CONJURE_WORKER_NOTATION not set, assuming watch all (development only)')
    activatedWorkerNotation = '#'
  } else {
    throw new Error('Must set CONJURE_WORKER_NOTATION to run worker')
  }
}

const activatedWorkersHash = require('./walk.js')
const activatedWorkers = Object.keys(activatedWorkersHash)
const activatedWorkerNotationExpr = new RegExp('^' + activatedWorkerNotation.replace(/\./g, '\\.').replace(/\*/g, '\\w+').replace(/#/g, '.*') + '$')
const activatedPostRoutes = []

for (const activatedWorker of activatedWorkers) {
  if (activatedWorkerNotationExpr.test(activatedWorker)) {
    const worker = require(activatedWorkersHash[ activatedWorker ])

    // if it's a route handler, then expose it
    if (typeof worker === 'function') {
      activatedPostRoutes.push({
        url: '/' + activatedWorker.replace(/\./g, '/'),
        handler: worker
      })
      log.info(`Activating direct call worker ${activatedWorker}`)
    } else {
      log.info(`Activating queue worker ${activatedWorker}`)
    }
  }
}

require('./express').setRoutes(activatedPostRoutes).listen()
