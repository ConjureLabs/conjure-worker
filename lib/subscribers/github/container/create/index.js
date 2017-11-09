const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.create');

const queue = new Queue('defaultExchange', 'repos-create', 'create');

function work() {
  return new Promise(async (resolve, reject) => {
    const message = await queue.subscribe();

    if (!message.body.content) {
      // todo: how should mq workers report errors? Throwing will crash all listeners on the machine
      return reject(new Error('Expected message.body.content'));
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
      message.ack();
      return resolve();
    }

    log.info(`created github container (${orgName}/${repoName} --> ${branch})`);
    message.ack();
    return resolve();
  });
}

function doWork() {
  work().then(() => {
    doWork();
  });
}
doWork();
