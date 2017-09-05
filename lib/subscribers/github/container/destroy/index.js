const Queue = require('conjure-core/classes/Queue');
const Container = require('conjure-core/classes/Container/GitHub');
const log = require('conjure-core/modules/log')('github.container.destroy');

const queue = new Queue('exchange', 'containers', 'container.destroy');

queue.subscribe((err, message) => {
  if (err) {
    // todo: deal w/ errors, and possibly requeue + ack?
    throw err;
  }

  if (!message.payload) {
    // todo: how should mq workers report errors? Throwing will crash all listeners on the machine
    throw new Error('Expected message.payload');
  }

  const container = new Container(message.payload);
  log.info(`destroying github container (${message.payload.orgName}/${message.payload.repoName} --> ${message.payload.branch})`);

  container.destroy(err => {
    if (err) {
      // todo: deal w/ errors, and possibly requeue + ack?
      throw err;
    }

    log.info(`destroyed github container (${message.payload.orgName}/${message.payload.repoName} --> ${message.payload.branch})`);
    message.ack();
  });
});
