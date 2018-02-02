const log = require('conjure-core/modules/log')('container destroy');

async function containerDestroy() {
  log.info('starting destroy');

  const { branch } = this.payload;

  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord();

  // make sure the repo/branch is spun up
  const DatabaseTable = require('db/table');
  // todo: detect correct server host, but on develop / test keep localhost
  const runningContainerRecords = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    is_active: true
  });

  if (!runningContainerRecords.length) {
    // no container record to destroy
    return;
  }

  // spin down vms
  const exec = require('conjure-core/modules/childProcess/exec');

  for (let i = 0; i < runningContainerRecords.length; i++) {
    const containerRecord = runningContainerRecords[i];

    if (containerRecord.container_id === null) {
      continue;
    }

    // todo: handle non-github repos
    const path = require('path');
    exec(`bash ./destroy.sh "${containerRecord.url_uid}" "${containerRecord.container_id}"`, {
      cwd: path.resolve(__dirname, '..', '..', 'git-container')
    }, err => {
      if (err) {
        return log.error(err);
      }
    });
  }

  // remove db reference to proxy
  await DatabaseTable.update('container', {
    is_active: false,
    active_stop: new Date(),
    updated: new Date()
  }, {
    repo: watchedRepo.id,
    branch: branch,
    is_active: true
  });
}

module.exports = containerDestroy;
