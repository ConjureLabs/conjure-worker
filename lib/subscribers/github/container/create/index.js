const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.create');

const queue = new Queue('container.create', true);

queue.subscribe(async (job, done) => {
  if (!job.body.content) {
    log.error(`Job ${job.id}, in container.create, had no body.content`);
    return done(new Error('Expected job.body.content'));
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(job.body.content);

  const Container = require('../../../../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`creating github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.create();
  } catch(err) {
    log.error(err);
    return done(err);
  }

  log.info(`created github container (${orgName}/${repoName} --> ${branch})`);
  done();
});
