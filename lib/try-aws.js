const config = require('conjure-core/modules/config');
const { Config, ECS } = require('aws-sdk');

const awsConfig = new Config({
  accessKeyId: config.aws.accessKey,
  secretAccessKey: config.aws.secretKey,
  region: config.aws.default.region
});

const ecs = new ECS(awsConfig);

console.log(ecs);
