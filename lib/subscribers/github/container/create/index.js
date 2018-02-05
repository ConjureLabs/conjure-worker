const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.create');

const queue = new Queue('defaultExchange', 'repos-create', 'create');

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

  log.info(`creating github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.create();
  } catch(err) {
    log.error(err);
    message.done();
    return;
  }

  log.info(`created github container (${orgName}/${repoName} --> ${branch})`);
  message.done();
});
