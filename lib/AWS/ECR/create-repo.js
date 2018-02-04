module.exports = function createRepo(watchedRepoRecord) {
  return new Promise((resolve, reject) => {
    const getRepoName = require('../../AWS/ECR/get-repo-name');
    const repoName = getRepoName(watchedRepoRecord);

    const AWS = require('../');
    const ecr = new AWS.ECR();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECR.html#createRepository-property
    ecr.createRepository({
      repositoryName: repoName
    }, err => {
      if (err) {
        // repo may already exist, then we don't want to error
        if (!(
          err.message &&
          err.message.includes('The repository with name ') &&
          err.message.includes(' already exists in the registry with id ')
        )) {
          return reject(err);
        }
      }

      resolve();
    });
  });
};
