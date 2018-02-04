const Container = require('../');
const config = require('conjure-core/modules/config');

const webUrl = config.app.web.url;

const gitHubCommentSignature = [
  '',
  '---',
  '',
  `__This message was generated via [<kbd>Conjure.sh</kbd>](${webUrl})__`
];

class GitHubContainer extends Container {
  // saving github comment, when creating a new container
  async create() {
    const Issue = require('conjure-core/classes/Repo/GitHub/Issue');
    const issue = new Issue(this.payload);

    // commenting on issue thread to notify that an instance is spinning up
    await issue.upsertComment([
      `:hourglass_flowing_sand: [Conjure](${webUrl}) is spinning up this branch`
    ].concat(gitHubCommentSignature).join('\n'));

    // create vm
    const containerUid = await super.create();
    const containerUrl = `${config.app.web.protocol}://${containerUid}.view.${config.app.web.host}`;

    await issue.upsertComment([
      `:octocat: [You can view this branch on Conjure](${containerUrl})`
    ].concat(gitHubCommentSignature).join('\n'));
  }

  async destroy() {
    await super.destroy();

    const Issue = require('conjure-core/classes/Repo/GitHub/Issue');
    const issue = new Issue(this.payload);

    await issue.deleteComment();
  }
}

module.exports = GitHubContainer;
