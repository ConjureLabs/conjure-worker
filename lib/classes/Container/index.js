class Container {
  constructor(payloadInstance) {
    this.payload = payloadInstance
  }

  // should be extended by Github & other child classes, as needed
  // expected to return a promise
  getConfig() {
    // should resolve config
  }

  // to be extended by child
  // expected to return a promise
  dockerBuild() {
    // should resolve uid
  }
}

Container.prototype.create = require('./create')
Container.prototype.update = require('./update')
Container.prototype.start = require('./start')
Container.prototype.stop = require('./stop')
Container.prototype.logs = require('./logs')

module.exports = Container
