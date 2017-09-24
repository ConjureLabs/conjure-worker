module.exports = () => {
  const server = require('../express').getServer();
  const preparedServer = require('http').Server(server);
  const io = require('socket.io')(preparedServer);

  io.on('connection', socket => {
    console.log('socket connected');
  });
};
