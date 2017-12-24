console.log('\n\tW  O  R  K  E  R\n');

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', err => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(48001);

setTimeout(() => {
  setInterval(() => {
    server.send('via worker', 48000);
  }, 1000);
}, 6000);
