const io = require('../../').getSocketServer();
const namespace = io.of('/container/logs');

io.on('connection', socket => {
  console.log('socket connected');
});

namespace.on('connection', socket => {
  console.log('namespace connected');

  // client must first auth
  socket.on('auth', ({ containerUid, sessionKey }) => {
    const checkSessionValidity = require('../../').checkSessionValidity;
    if (!checkSessionValidity(containerUid, sessionKey)) {
      console.log(`socket not authorized to view logs for container_uid ${containerUid} (key given was ${sessionKey})`);
      socket.disconnect(true);
      return;
    }

    // auth must have passed
    
    const Container = require('../../../classes/Container/GitHub');
    const container = new Container();

    container.logs(containerUid, (err, emitter) => {
      if (err) {
        return next(err);
      }

      emitter.stdout.on('data', data => {
        socket.emit('out', data.toString());
      });

      emitter.stderr.on('data', data => {
        socket.emit('err', data.toString());
      });

      emitter.on('end', () => {
        socket.disconnect(true);
      });
    });
  });
});