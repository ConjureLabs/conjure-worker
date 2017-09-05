const Container = require('conjure-core/classes/Container');
const log = require('conjure-core/modules/log')('github container');
const async = require('async');
const config = require('conjure-core/modules/config');

const webProtocol = config.app.web.protocol;
const webUrl = config.app.web.url;

const gitHubCommentSignature = [
  '',
  '---',
  '',
  `__This message was generated via [<kbd>⎔ Conjure.sh</kbd>](${webUrl})__`
];

class GitHubContainer extends Container {
  // saving github comment, when creating a new container
  create(callback) {
    const waterfall = [];

    const Issue = require('conjure-core/classes/Repo/GitHub/Issue');
    const issue = new Issue(this.payload);

    // commenting on issue thread to notify that an instance is spinning up
    waterfall.push(cb => {
      issue.upsertComment([
        `:hourglass_flowing_sand: [Conjure.sh](${webUrl}) is spinning up this branch`,
      ].concat(gitHubCommentSignature).join('\n'), err => {
        cb(err);
      });
    });

    // create vm
    waterfall.push(cb => {
      super.create((err, containerDomain) => {
        cb(err, containerDomain);
      });
    });

    waterfall.push((containerDomain, cb) => {
      const containerUrl = `${webProtocol}://${containerDomain}`;
      issue.upsertComment([
        `:octocat: [You can view this branch on Conjure](${containerUrl})`
      ].concat(gitHubCommentSignature).join('\n'), err => {
        cb(err);
      });
    });

    async.waterfall(waterfall, callback);
  }

  destroy(callback) {
    super.destroy(err => {
      if (err) {
        return callback(err);
      }

      const Issue = require('conjure-core/classes/Repo/GitHub/Issue');
      const issue = new Issue(this.payload);

      issue.deleteComment(err => {
        if (err) {
          log.error(err);
          return;
        }

        callback();
      });
    });
  }
}

module.exports = GitHubContainer;
