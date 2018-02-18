const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.start');

const queue = new Queue('container.start', true);

queue.subscribe(async (job, done) => {
  if (!job.body.content) {
    log.error(`Job ${job.id}, in container.start, had no body.content`);
    return done(new Error('Expected job.body.content'));
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(job.body.content);

  const Container = require('../../../../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`starting github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.start();
  } catch(err) {
    log.error(err);
    done(err);
    return;
  }

  log.info(`started github container (${orgName}/${repoName} --> ${branch})`);
  done();
});
