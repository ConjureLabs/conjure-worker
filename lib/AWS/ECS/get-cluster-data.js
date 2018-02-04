module.exports = function getClusterData(watchedRepoRecord) {
  return new Promise((resolve, reject) => {
    const getResourceName = require('./get-resource-name');
    const resourceName = getResourceName(watchedRepoRecord);

    const clusterParam = {
      clusters: [resourceName]
    };

    const AWS = require('../');
    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#describeClusters-property
    ecs.describeClusters(clusterParam, (err, data) => {
      if (err) {
        return reject(err);
      }

      for (let i = 0; i < data.clusters.length; i++) {
        if (data.clusters[i].status === 'ACTIVE') {
          return resolve(data.clusters[i]);
        }
      }

      resolve();
    });
  });
};
