const log = require('conjure-core/modules/log')('github.container.update');

module.exports = task => {
  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload');
  const payload = new GitHubWebhookPayload(task);

  const Container = require('../classes/Container/GitHub');
  const container = new Container(payload);

  const { orgName, repoName, branch } = payload;

  log.info(`updating github container (${orgName}/${repoName} --> ${branch})`);

  try {
    await container.update();
  } catch(err) {
    return err;
  }

  log.info(`updated github container (${orgName}/${repoName} --> ${branch})`);
  return container;
};
