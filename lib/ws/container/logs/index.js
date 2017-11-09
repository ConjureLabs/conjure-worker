const log = require('conjure-core/modules/log')('container logs websocket');
const io = require('../../').getSocketServer();
const namespace = io.of('/container/logs');

io.on('connection', () => {
  console.log('socket connected');
});

namespace.on('connection', socket => {
  console.log('namespace connected');

  // client must first auth
  socket.on('auth', async ({ containerUid, sessionKey }) => {
    const checkSessionValidity = require('../../').checkSessionValidity;
    if (!checkSessionValidity(containerUid, sessionKey)) {
      console.log(`socket not authorized to view logs for container_uid ${containerUid} (key given was ${sessionKey})`);
      socket.disconnect(true);
      return;
    }

    // auth must have passed
    
    const Container = require('../../../classes/Container/GitHub');
    const container = new Container();

    let emitter;
    try {
      emitter = await container.logs(containerUid);
    } catch(err) {
      log.error(err);
      return;
    }

    emitter.stdout.on('data', data => {
      socket.emit('out', data.toString());
    });

    emitter.stderr.on('data', data => {
      socket.emit('err', data.toString());
    });

    emitter.on('exit', code => {
      if (code !== 0) {
        log.error(`container logs tailing exited with code ${code}`);
      }

      socket.disconnect(true);
    });
  });
});
