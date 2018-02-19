const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.stop');

const queue = new Queue('container.stop', true);

queue.subscribe(async (jobData, done) => {
  if (!jobData.body.content) {
    log.error(`Job ${jobData.id}, in container.stop, had no body.content`);
    return done(new Error('Expected jobData.body.content'));
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(jobData.body.content);

  const Container = require('../../../../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`stopping github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.stop();
  } catch(err) {
    log.error(err);
    done(err);
    return;
  }

  log.info(`stopped github container (${orgName}/${repoName} --> ${branch})`);
  done();
});
