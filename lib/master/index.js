console.log('\n\tM  A  S  T  E  R\n');

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', err => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(48000);

setTimeout(() => {
  setInterval(() => {
    server.send('via master', 48001);
  }, 1000);
}, 6000);
