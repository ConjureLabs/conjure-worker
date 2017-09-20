class Container {
  constructor(payloadInstance) {
    this.payload = payloadInstance;
  }
}

Container.prototype.create = require('./create');
Container.prototype.destroy = require('./destroy');
Container.prototype.update = require('./update');
Container.prototype.logs = require('./logs');

module.exports = Container;
