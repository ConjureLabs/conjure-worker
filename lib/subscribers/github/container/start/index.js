const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.start');

const queue = new Queue('defaultExchange', 'repos-start', 'start');

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

  log.info(`starting github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.start();
  } catch(err) {
    log.error(err);
    message.done();
    return;
  }

  log.info(`started github container (${orgName}/${repoName} --> ${branch})`);
  message.done();
});
