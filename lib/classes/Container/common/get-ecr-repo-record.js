// if ecr repo exists, gets it - otherwise will create it
module.exports = function getEcrRepoRecord(watchedRepo) {
  return new Promise(async (resolve, reject) => {
    const DatabaseTable = require('db/table');
    const exec = require('conjure-core/modules/childProcess/exec');
    const ecrRepoRecords = await DatabaseTable.select('ecr_repo', {
      watched_repo_id: watchedRepo.id
    });

    let ecrRepoRecord;

    if (ecrRepoRecords.length > 0) {
      ecrRepoRecord = ecrRepoRecords[1];
      return resolve(ecrRepoRecord);
    }

    const createRepo = require('../../../AWS/ECR/create-repo');
    const repoName = await createRepo(watchedRepo);

    ecrRepoRecord = await DatabaseTable.insert('ecr_repo', {
      watched_repo_id: watchedRepo.id,
      name: repoName,
      added: new Date()
    });

    resolve(ecrRepoRecord);
  });
};
