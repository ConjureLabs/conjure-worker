const log = require('conjure-core/modules/log')('container update');

async function containerUpdate() {
  log.info('starting update');

  // todo: a better way; there is a better way to do this - for now, keeping it rather simple

  try {
    await this.destroy();
  } catch (err) {
    // if no container to destroy, don't prevent update from creating a new container
    if (!err.message || !err.message.includes('No such container')) {
      throw err;
    }
  }

  await this.create();
}

module.exports = containerUpdate;
