const crypto = require('crypto');

const secret = require('../secret');
const Workers = require('../workers');

module.exports = task => {
  const key = generateKey();
  const signature = crypto.createHash('md5').update(`\n\t${secret}\n\n${key}\n`).digest('hex');
  
  Workers.register(key, {
    signature,
    containers: 0
  });

  return {
    key,
    signature
  };
};

const keyChars = 'asdfghjklqwertyuiopzxcvbnmASDFGHJKLQWERTYUIOPZXCVBNM1234567890_-'.split('');
function generateKey() {
  const len = 24;
  let key = '';
  for (let i = 0; i < len; i++) {
    key += keyChars[ Math.floor(Math.random() * keyChars.length) ];
  }
  return `${Date.now()}+${key}`;
}
