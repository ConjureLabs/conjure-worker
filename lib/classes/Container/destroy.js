const log = require('conjure-core/modules/log')('container destroy');

function containerDestroy(callback) {
  log.info('starting destroy');

  const {
    branch
  } = this.payload;

  const waterfallSteps = [];

  // get watched repo record
  waterfallSteps.push(cb => {
    this.payload.getWatchedRepoRecord(cb);
  });

  // make sure the repo/branch is spun up
  waterfallSteps.push((watchedRepo, cb, asyncBreak) => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    // todo: detect correct server host, but on develop / test keep localhost
    DatabaseTable.select('container', {
      repo: watchedRepo.id,
      branch: branch,
      is_active: true
    }, (err, records) => {
      if (err) {
        return cb(err);
      }

      if (!records.length) {
        return asyncBreak();
      }

      cb(null, watchedRepo, records);
    });
  });

  // spin down vms
  waterfallSteps.push((watchedRepo, runningContainerRecords, cb) => {
    const exec = require('conjure-core/modules/childProcess/exec');

    for (let i = 0; i < runningContainerRecords.length; i++) {
      const containerRecord = runningContainerRecords[i];

      // todo: handle non-github repos
      const path = require('path');
      exec(`bash ./destroy.sh "${containerRecord.url_uid}" "${containerRecord.container_id}"`, {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      }, err => {
        if (err) {
          // can't kick to callback
          return log.error(err);
        }
      });
    }

    cb(null, watchedRepo);
  });

  // remove db reference to proxy
  waterfallSteps.push((watchedRepo, cb) => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    DatabaseTable.update('container', {
      is_active: false,
      active_stop: new Date(),
      updated: new Date()
    }, {
      repo: watchedRepo.id,
      branch: branch,
      is_active: true
    }, err => {
      cb(err);
    });
  });

  const waterfall = require('conjure-core/modules/async/waterfall');
  waterfall(waterfallSteps, err => {
    callback(err);
  });
}

module.exports = containerDestroy;
