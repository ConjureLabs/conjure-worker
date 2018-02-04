const { ContentError } = require('err');

module.exports = function getConfig() {
  return new Promise(async (resolve, reject) => {
    // get github client
    const gitHubAccount = await this.payload.getGitHubAccount();
    if (!gitHubAccount) {
      return reject(new ContentError('No github account record found'));
    }
    const github = require('octonode');
    const gitHubClient = github.client(gitHubAccount.access_token);

    const {
      branch,
      orgName,
      repoName
    } = this.payload;

    // get yml config
    const repoConfig = await getProjectYml(gitHubClient, orgName, repoName, branch);

    if (repoConfig.machine.start == undefined) {
      return reject(new ContentError('No container start command defined or known'));
    }

    if (repoConfig.machine.port == undefined) {
      return reject(new ContentError('No container port defined'));
    }

    resolve(repoConfig);
  });
};

function getProjectYml(gitHubClient, orgName, repoName, branch) {
  return new Promise((resolve, reject) => {
    gitHubClient
      .repo(`${orgName}/${repoName}`)
      .contents('.conjure/config.yml', branch, (err, file) => {
        if (
          (err && err.message === 'Not Found') ||
          (!file || file.type !== 'file' || typeof file.content !== 'string')
        ) {
          return reject(new ContentError('No Conjure YML config present in repo'));
        }

        if (err) {
          return reject(err);
        }

        const yml = new Buffer(file.content, 'base64');
        const Config = require('conjure-core/classes/Repo/Config');
        const ymlContent = new Config(yml);

        if (ymlContent.valid === false) {
          return reject(new ContentError('Invalid Conjure YML config'));
        }

        resolve(ymlContent);
      });
  });
}
