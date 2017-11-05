const Container = require('../');
const log = require('conjure-core/modules/log')('github container');
const async = require('async');
const config = require('conjure-core/modules/config');

const webUrl = config.app.web.url;

const gitHubCommentSignature = [
  '',
  '---',
  '',
  `__This message was generated via [<kbd>⎔ Conjure.sh</kbd>](${webUrl})__`
];

class GitHubContainer extends Container {
  // saving github comment, when creating a new container
  async create() {
    const waterfall = [];

    const Issue = require('conjure-core/classes/Repo/GitHub/Issue');
    const issue = new Issue(this.payload);

    // commenting on issue thread to notify that an instance is spinning up
    waterfall.push(cb => {
      issue.upsertComment([
        `:hourglass_flowing_sand: [Conjure.sh](${webUrl}) is spinning up this branch`
      ].concat(gitHubCommentSignature).join('\n'), err => {
        cb(err);
      });
    });

    // create vm
    waterfall.push(async cb => {
      let containerUid;
      try {
        containerUid = super.create();
      } catch (err) {
        return cb(err);
      }
      
      cb(null, `${config.app.web.protocol}://${containerUid}.view.${config.app.web.host}`);
    });

    waterfall.push((containerUrl, cb) => {
      issue.upsertComment([
        `:octocat: [You can view this branch on Conjure](${containerUrl})`
      ].concat(gitHubCommentSignature).join('\n'), err => {
        cb(err);
      });
    });

    async.waterfall(waterfall, err => {
      if (err) {
        throw err;
      }
    });
  }

  async destroy() {
    await super.destroy();

    const Issue = require('conjure-core/classes/Repo/GitHub/Issue');
    const issue = new Issue(this.payload);

    issue.deleteComment(err => {
      if (err) {
        // not throwing
        log.error(err);
        return;
      }
    });
  }
}

module.exports = GitHubContainer;
