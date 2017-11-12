const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.destroy');

const queue = new Queue('defaultExchange', 'repos-destroy', 'destroy');

queue.subscribe(async message => {
  if (!message.body.content) {
    // todo: how should mq workers report errors? Throwing will crash all listeners on the machine
    throw new Error('Expected message.body.content');
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(message.body.content);

  const Container = require('../../../../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`destroying github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.destroy();
  } catch(err) {
    log.error(err);
    message.done();
    return;
  }

  log.info(`destroyed github container (${orgName}/${repoName} --> ${branch})`);
  message.done();
});
