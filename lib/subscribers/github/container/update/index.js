const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.update');

const queue = new Queue('defaultExchange', 'repos-update', 'update');

queue.subscribe(async message => {
  if (!message.body.content) {
    log.error(new Error('Expected message.body.content'));
    message.done();
    return;
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(message.body.content);

  const Container = require('../../../../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`updating github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.update();
  } catch(err) {
    log.error(err);
    message.done();
    return;
  }

  log.info(`updated github container (${orgName}/${repoName} --> ${branch})`);
  message.done();
});
