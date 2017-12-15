const log = require('conjure-core/modules/log')('github.container.destroy');

module.exports = task => {
  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(task);

  const Container = require('../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`destroying github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.destroy();
  } catch(err) {
    return err;
  }

  log.info(`destroyed github container (${orgName}/${repoName} --> ${branch})`);
  return container;
});
