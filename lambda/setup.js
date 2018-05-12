module.exports = function setup(log) {
  require('@conjurelabs/utils/process/handle-exceptions')

  const config = require('conjure-core/modules/config')

  // configure db connection
  require('@conjurelabs/db').init(config.database.pg, {
    transformCamelCase: true
  }, (sql, args) => {
    log.dev.info(sql, process.env.NODE_ENV === 'production' && args ? '---REDACTED---' : args)
  })
}
