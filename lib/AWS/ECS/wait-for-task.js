const { UnexpectedError } = require('err');

module.exports = function waitForTask(task) {
  return new Promise((resolve, reject) => {
    const param = {
      cluster: task.clusterArn,
      tasks: [ task.taskArn ]
    };

    const AWS = require('../');
    const ecs = new AWS.ECS();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#waitFor-property
    ecs.waitFor('tasksRunning', param, (err, data) => {
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
