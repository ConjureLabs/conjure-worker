class Container {
  constructor(payloadInstance) {
    this.payload = payloadInstance;
  }
}

Container.prototype.create = require('./create');
Container.prototype.destroy = require('./destroy');
Container.prototype.update = require('./update');

module.exports = Container;
