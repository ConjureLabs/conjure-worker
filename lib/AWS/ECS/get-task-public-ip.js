const { UnexpectedError } = require('err');

module.exports = function getTaskPublicIp(task) {
  return new Promise((resolve, reject) => {
    if (
      !task ||
      !Array.isArray(task.attachments) ||
      !task.attachments.length ||
      !Array.isArray(task.attachments[0].details)
    ) {
      return reject(new UnexpectedError('task given does not have listed attachments'));
    }

    let eni;
    for (let i = 0; i < task.attachments[0].details.length; i++) {
      if (task.attachments[0].details[i].name === 'networkInterfaceId') {
        eni = task.attachments[0].details[i].value;
        break;
      }
    }

    if (typeof eni !== 'string') {
      return reject(new UnexpectedError('task given does not have a listed network interface Id'));
    }

    const param = {
      NetworkInterfaceIds: [eni]
    };

    const AWS = require('../');
    const ec2 = new AWS.EC2();

    // see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeNetworkInterfaces-property
    ec2.describeNetworkInterfaces(param, (err, data) => {
      if (err) {
        return reject(err);
      }
      if (
        !data ||
        !Array.isArray(data.NetworkInterfaces) ||
        !data.NetworkInterfaces.length ||
        !data.NetworkInterfaces[0].Association ||
        !data.NetworkInterfaces[0].Association.PublicIp
      ) {
        return reject(new UnexpectedError('describeNetworkInterfaces returned invalid data'));
      }
      resolve(data.NetworkInterfaces[0].Association.PublicIp);
    });
  });
};
