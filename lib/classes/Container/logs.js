const log = require('conjure-core/modules/log')('container logs');
const { UnexpectedError } = require('err');

async function containerLogs(urlUid) {
  log.info('starting logs tail');

  // make sure the repo/branch is spun up
  const DatabaseTable = require('conjure-core/classes/DatabaseTable');
  // todo: detect correct server host, but on develop / test keep localhost
  const records = await DatabaseTable.select('container', {
    url_uid: urlUid,
    is_active: true
  });

  if (!records.length) {
    throw new UnexpectedError(`No container record for uid ${urlUid}`);
  }

  // tail it, and return the stream
  const spawn = require('child_process').spawn;

  // there may be more than one instance, so just tail the first
  const containerRecord = records[0];

  const logs = spawn('docker', ['logs', '-f', containerRecord.container_id]);

  // logs is an emitter
  return logs;
}

module.exports = containerLogs;
