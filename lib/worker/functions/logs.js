module.exports = task => {
  const { req, res } = task;
  const { containerUid } = req.body;

  // todo: verify orgName (within req.body) matches up

  // generating a private session key, used to auth the connection
  const { generateContainerSessionKey } = require('../ws');

  res.send({
    sessionKey: generateContainerSessionKey(containerUid)
  });
};

// triggering socket.io integration for tailing logs
require('../ws/container/logs');
