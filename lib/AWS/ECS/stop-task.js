module.exports = function stopTask(clusterArn, taskArn) {
  return new Promise((resolve, reject) => {
    const param = {
      cluster: clusterArn,
      task: taskArn,
      reason: 'stopped via Conjure worker'
    }

    const AWS = require('../')
    const ecs = new AWS.ECS()

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#stopTask-property
    ecs.stopTask(param, err => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}
