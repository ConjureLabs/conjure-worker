module.exports = (req, res, next) => {
  const { orgName, containerUid } = req.body;

  // todo: verify orgName matches up

  // generating a private session key, used to auth the connection
  const { generateContainerSessionKey } = require('../../../../ws');

  res.send({
    sessionKey: generateContainerSessionKey(containerUid),
    host: require('os').hostname(),
    port: process.env.PORT
  });
};

// triggering socket.io integration for tailing logs
const server = require('../../../../ws/container/logs');
