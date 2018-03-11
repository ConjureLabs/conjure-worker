const { UnexpectedError } = require('@conjurelabs/err');

module.exports = function runTask(watchedRepoRecord, taskDefinitionRevision) {
  return new Promise((resolve, reject) => {
    const getResourceName = require('./get-resource-name');
    const resourceName = getResourceName(watchedRepoRecord);

    const taskParam = {
      cluster: resourceName,
      taskDefinition: `${resourceName}:${taskDefinitionRevision}`,
      launchType: 'FARGATE',
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: 'ENABLED',
          subnets: ['subnet-315dbc1e'], // todo: config? pull down?
          // conjure-fargate-instance-security-group
          securityGroups: ['sg-bc61abcb'] // todo: config? pull down?
        }
      }
    };

    const AWS = require('../');
    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#runTask-property
    ecs.runTask(taskParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      if (!data || !Array.isArray(data.tasks) || !data.tasks[0]) {
        return reject(new UnexpectedError('runTask returned invalid data'));
      }
      resolve(data.tasks[0]);
    });
  });
};
