const pckg = require('../../../package.json');
const os = require('os');

module.exports = () => {
  return {
    version: pckg.version,
    memory: {
      total: os.totalmem(),
      free: os.freemem()
    },
    uptime: os.uptime()
  };
};
