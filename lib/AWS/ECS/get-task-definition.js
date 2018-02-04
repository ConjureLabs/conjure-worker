module.exports = function getTaskDefinition(watchedRepoRecord) {
  return new Promise((resolve, reject) => {
    const getResourceName = require('./get-resource-name');
    const resourceName = getResourceName(watchedRepoRecord);

    const taskListParam = {
      familyPrefix: resourceName
    };

    const AWS = require('../');
    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#listTaskDefinitions-property
    ecs.listTaskDefinitions(taskListParam, (err, data) => {
      if (err) {
        return reject(err);
      }

      if (Array.isArray(data.taskDefinitionArns) && data.taskDefinitionArns.length) {
        const revision = data.taskDefinitionArns[ data.taskDefinitionArns.length - 1].split(':').pop();
        return resolve(revision);
      }

      resolve();
    });
  });
};
