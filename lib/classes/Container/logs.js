const log = require('conjure-core/modules/log')('container logs');

function containerLogs(urlUid, callback) {
  log.info('starting logs tail');

  const waterfallSteps = [];

  // make sure the repo/branch is spun up
  waterfallSteps.push(cb => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    // todo: detect correct server host, but on develop / test keep localhost
    DatabaseTable.select('container', {
      url_uid: urlUid,
      is_active: true
    }, (err, records) => {
      if (err) {
        return cb(err);
      }

      if (!records.length) {
        return asyncBreak();
      }

      cb(null, records);
    });
  });

  // tail it, and return the stream
  waterfallSteps.push((runningContainerRecords, cb) => {
    const spawn = require('child_process').spawn;

    // there may be more than one instance, so just tail the first
    const containerRecord = runningContainerRecords[0];

    const path = require('path');
    const logs = spawn('docker', ['logs', '-f', containerRecord.container_id]);

    cb(null, logs);
  });

  const waterfall = require('conjure-core/modules/async/waterfall');
  waterfall(waterfallSteps, (err, emitter) => {
    callback(err, emitter);
  });
}

module.exports = containerLogs;
