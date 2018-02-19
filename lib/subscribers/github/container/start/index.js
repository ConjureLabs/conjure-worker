const Queue = require('conjure-core/classes/Queue');
const log = require('conjure-core/modules/log')('github.container.start');

const queue = new Queue('container.start', true);

queue.subscribe(async (jobData, done) => {
  if (!jobData.content) {
    log.error(`Job ${jobData.id}, in container.start, had no body.content`);
    return done(new Error('Expected jobData.content'));
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(jobData.content);

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
