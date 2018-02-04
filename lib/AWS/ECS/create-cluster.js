module.exports = function createCluster(watchedRepoRecord) {
  return new Promise((resolve, reject) => {
    const getResourceName = require('./get-resource-name');
    const resourceName = getResourceName(watchedRepoRecord);

    const clusterParam = {
      clusterName: resourceName
    };

    const AWS = require('../');
    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#createCluster-property
    ecs.createCluster(clusterParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
};
