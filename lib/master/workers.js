module.exports = class Workers {
  static tracked = {}

  static register(key, attributes) {
    this.tracked[key] = attributes;
  }

  static deregister(key) {
    delete this.tracked[key];
  }
}
