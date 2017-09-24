const containerSessionKeys = {}; // cached
let io; // cached
const keyLen = 64;
const keyChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()-=_+~;:,.<>/?|'.split('');

function generateContainerSessionKey(containerUid) {
  console.log('>>> generateContainerSessionKey');
  let key = '';

  // generate the key
  for (i = 0; i < keyLen; i++) {
    key += keyChars[ Math.floor( Math.random() * keyChars.length ) ];
  }

  // keys in containerSessionKeys are the client session tokens, while the values is the container uid associated
  const allKeys = Object.keys(containerSessionKeys);

  // if key already exists, then we have to generate again (ensure unique)
  if (allKeys.includes(key)) {
    return generateContainerSessionKey(containerUid);
  }

  containerSessionKeys[key] = containerUid;

  return key;
}

function removeKey(key) {
  delete containerSessionKeys[key];
}

function removeContainerKeys(containerUid) {
  const keys = Object.keys(containerSessionKeys);
  for (let i = 0; i < keys.length; i++) {
    if (containerSessionKeys[ keys[i] ] === containerUid) {
      delete containerSessionKeys[ keys[i] ];
    }
  }
}

function checkSessionValidity(containerUid, sessionKey) {
  if (containerSessionKeys[sessionKey] !== containerUid) {
    return false;
  }

  return true;
}

function getSocketServer() {
  if (io) {
    return io;
  }

  console.log('Enabling sockets');

  const server = require('../express').getServer();
  const preparedServer = require('http').Server(server);
  io = require('socket.io')(preparedServer);
  return io;
}

module.exports = {
  generateContainerSessionKey,
  removeKey,
  removeContainerKeys,
  checkSessionValidity,
  enableSockets
};
