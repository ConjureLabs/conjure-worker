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

  // const Container = require('../../../../classes/Container/GitHub');
  // const container = new Container();

  // container.logs(containerUid, (err, emitter) => {
  //   if (err) {
  //     return next(err);
  //   }

  //   const net = require('net');
  //   const socket = new net.Socket({
  //     readable: true,
  //     writable: false
  //   });

  //   socket.on('close', () => {
  //     console.log('closed');
  //   });

  //   socket.on('connect', () => {
  //     console.log('connected');
  //     console.log(socket.address());
  //   });

  //   console.log(socket.address());

  //   socket.connect();

  //   // emitter.stdout.pipe(process.stdout);
  //   // emitter.stderr.pipe(process.stderr);
  //   // emitter.on('end', function() {
  //   //   console.log('finished');
  //   // });
  // });
};

// triggering socket.io integration
const server = require('../../../../ws').enableSockets();
