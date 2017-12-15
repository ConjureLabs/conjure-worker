const log = require('conjure-core/modules/log')('github.container.create');

module.exports = task => {
  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(task);

  const Container = require('../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`creating github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.create();
  } catch(err) {
    return err;
  }

  log.info(`created github container (${orgName}/${repoName} --> ${branch})`);
  return container;
});
