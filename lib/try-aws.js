const config = require('conjure-core/modules/config');
const { Config, ECS, ECR } = require('aws-sdk');
const { promisify } = require('util');

async function x() {
  // const awsConfig = new Config({
  //   accessKeyId: config.aws.accessKey,
  //   secretAccessKey: config.aws.secretKey,
  //   region: config.aws.default.region
  // });

  // const ecr = new ECR(awsConfig);
  // console.log('...');

  // const DatabaseTable = require('conjure-core/classes/DatabaseTable');
  // const WatchedRepo = new DatabaseTable('watched_repo');

  // const records = await WatchedRepo.select({
  //   id: 1
  // });

  // const record = records[0];

  // if (record.ecr_repo_created === false) {
  //   await promisify(ecr.createRepository)({
  //     repositoryName: `conjure/watched-${record.id}`
  //   });

  //   record.ecr_repo_created = true;
  //   await record.save();
  // }

  const awsConfig = new Config({
    accessKeyId: config.aws.accessKey,
    secretAccessKey: config.aws.secretKey,
    region: config.aws.default.region
  });

  const ecs = new ECS(awsConfig);

  const DatabaseTable = require('conjure-core/classes/DatabaseTable');
  const WatchedRepo = new DatabaseTable('watched_repo');

  const records = await WatchedRepo.select({
    id: 1
  });

  const record = records[0];

  // if (record.ecr_repo_created === false) {
  //   await promisify(ecr.createRepository)({
  //     repositoryName: `conjure/watched-${record.id}`
  //   });

  //   record.ecr_repo_created = true;
  //   await record.save();
  // }
  
  ecs.registerTaskDefinition({
    containerDefinitions: [{
      name: 'test-1',
      cpu: '10',
      essential: true,
      image: '657781215424.dkr.ecr.us-east-1.amazonaws.com/conjure/watched-1',
      memory: '10'
    }],
    cpu: '256',
    memory: '256',
    family: 'test-1',
    requiresCompatibilities: ['FARGATE'],
    networkMode: 'awsvpc'
  }, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log(data);
    }
  });

}

console.log('yeah yeah');
x()
