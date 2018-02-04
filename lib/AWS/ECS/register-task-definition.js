const config = require('conjure-core/modules/config');

module.exports = function registerTaskDefinition(watchedRepoRecord, repoConfig) {
  return new Promise((resolve, reject) => {
    const getResourceName = require('./get-resource-name');
    const resourceName = getResourceName(watchedRepoRecord);

    const builtDockerName = `conjure/${resourceName}`;
    const ecrReposUrl = `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`;

    const taskParam = {
      containerDefinitions: [{
        entryPoint: ['bash'],
        command: ['/var/conjure/support/entrypoint.sh'],
        portMappings: [{
          protocol: 'tcp',
          hostPort: repoConfig.machine.port,
          containerPort: repoConfig.machine.port
        }],
        workingDirectory: '/var/conjure/code/',
        image: `${ecrReposUrl}${builtDockerName}:latest`,
        name: resourceName
      }],
      memory: '512',
      cpu: '256',
      executionRoleArn: config.aws.arn.ecs.executionRole,
      taskRoleArn: config.aws.arn.ecs.taskRole,
      requiresCompatibilities: ['FARGATE'],
      family: resourceName,
      networkMode: 'awsvpc'
    };

    const AWS = require('../');
    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#registerTaskDefinition-property
    ecs.registerTaskDefinition(taskParam, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.taskDefinition.revision);
    });
  });
};
