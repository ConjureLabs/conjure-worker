const Queue = require('conjure-core/classes/Queue');
const Container = require('conjure-core/classes/Container/GitHub');
const log = require('conjure-core/modules/log')('github.container.destroy');

const queue = new Queue('defaultExchange', 'repos', 'github.container.destroy');

queue.subscribe((err, message) => {
  if (err) {
    // todo: deal w/ errors, and possibly requeue + ack?
    throw err;
  }

  if (!message.body.payload) {
    // todo: how should mq workers report errors? Throwing will crash all listeners on the machine
    throw new Error('Expected message.body.payload');
  }

  const container = new Container(message.body.payload);

  const {
    orgName,
    repoName,
    branch
  } = message.body.payload;

  log.info(`destroying github container (${orgName}/${repoName} --> ${branch})`);

  container.destroy(err => {
    if (err) {
      // todo: deal w/ errors, and possibly requeue + ack?
      throw err;
    }

    log.info(`destroyed github container (${orgName}/${repoName} --> ${branch})`);
    message.ack();
  });
});
