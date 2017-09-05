const ContentError = require('conjure-core/modules/err').ContentError;
const UnexpectedError = require('conjure-core/modules/err').UnexpectedError;
const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('container create');

let workerPort = parseInt(process.env.CONJURE_CONTAINER_STARTING_PORT, 10);
const bashNoOp = ':';

function containerCreate(callback) {
  log.info('starting create');

  const {
    branch,
    orgName,
    repoName
  } = this.payload;

  const uid = require('uid');

  const containerUid = uid(24);
  const waterfallSteps = [];

  // get watched repo record
  waterfallSteps.push(cb => {
    this.payload.getWatchedRepoRecord(cb);
  });

  // make sure the repo/branch is not already spun up
  waterfallSteps.push((watchedRepo, cb, asyncBreak) => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    DatabaseTable.select('container', {
      repo: watchedRepo.id,
      branch: branch,
      is_active: true
    }, (err, records) => {
      if (err) {
        return cb(err);
      }

      if (records.length) {
        return asyncBreak(null);
      }

      cb(null, watchedRepo);
    });
  });

  // get github client
  waterfallSteps.push((watchedRepo, cb) => {
    this.payload.getGitHubAccount((err, gitHubAccount) => {
      if (err) {
        return cb(err);
      }

      if (!gitHubAccount) {
        return cb(new ContentError('No github account record found'));
      }

      const github = require('octonode');
      const gitHubClient = github.client(gitHubAccount.access_token);

      cb(null, watchedRepo, gitHubClient, gitHubAccount.access_token);
    });
  });

  // get yml config
  waterfallSteps.push((watchedRepo, gitHubClient, gitHubToken, cb) => {
    gitHubClient
      .repo(`${orgName}/${repoName}`)
      .contents('conjure.yml', branch, (err, file) => {
        if (
          (err && err.message === 'Not Found') ||
          (!file || file.type !== 'file' || typeof file.content !== 'string')
        ) {
          return cb(new ContentError('No Conjure YML config present in repo'));
        }

        if (err) {
          return cb(err);
        }

        const yml = new Buffer(file.content, 'base64');
        const Config = require('conjure-core/classes/Repo/Config');
        const repoConfig = new Config(yml);

        if (repoConfig.valid === false) {
          return cb(new ContentError('Invalid Conjure YML config'));
        }

        cb(null, watchedRepo, repoConfig, gitHubToken);
      });
  });

  // create record for container
  waterfallSteps.push((watchedRepo, repoConfig, gitHubToken, cb) => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    DatabaseTable.insert('container', {
      repo: watchedRepo.id,
      branch: branch,
      url_uid: containerUid,
      is_active: true,
      added: new Date()
    }, (err, rows) => {
      if (err) {
        return cb(err);
      }

      if (!Array.isArray(rows) || !rows.length) {
        return cb(new UnexpectedError('Container record failed to insert'));
      }

      cb(null, watchedRepo, repoConfig, gitHubToken, rows[0].id);
    });
  });

  // create container
  waterfallSteps.push((watchedRepo, repoConfig, gitHubToken, containerRowId, cb) => {
    const exec = require('conjure-core/modules/childProcess/exec');

    // todo: handle non-github repos
    
    let preSetupSteps = '';

    if (repoConfig.machine.pre.length) {
      preSetupSteps = repoConfig.machine.pre
        .map(command => {
          return `RUN ${command}`;
        })
        .join('\n');
      preSetupSteps = new Buffer(preSetupSteps).toString('base64');
    }

    const path = require('path');
    const command = `bash ./build.sh "https://${gitHubToken}:x-oauth-basic@github.com/${orgName}/${repoName}.git" "${branch}" "${containerUid}" "${preSetupSteps}" "${repoConfig.machine.setup || bashNoOp}"`;
    exec(command, {
      cwd: path.resolve(__dirname, '..', '..', 'git-container')
    }, err => {
      cb(err, watchedRepo, repoConfig, containerRowId);
    });
  });

  // run container
  waterfallSteps.push((watchedRepo, repoConfig, containerRowId, cb) => {
    if (repoConfig.machine.start === null) {
      return cb(new ContentError('No container start command defined or known'));
    }

    const exec = require('conjure-core/modules/childProcess/exec');

    // may need to keep trying, if docker ports are already in use
    function attemptDockerRun() {
      const hostPort = workerPort++;

      const extraEnvKeys = Object.keys(repoConfig.machine.environment);
      const extraEnvVars = !extraEnvKeys.length ? '' : extraEnvKeys
        .map(key => {
          return ` -e ${key}="${repoConfig.machine.environment[key]}"`;
        })
        .join('');

      const path = require('path');
      const command = `docker run --cidfile /tmp/${containerUid}.cid -i -t -d -p ${hostPort}:${repoConfig.machine.port}${extraEnvVars} "${containerUid}" ${repoConfig.machine.start}`;
      exec(command, {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      }, (runErr, stdout) => {
        if (runErr) {
          exec(`rm /tmp/${containerUid}.cid`, {}, rmCidErr => {
            if (rmCidErr) {
              log.error(rmCidErr);
            }

            if (runErr.message && runErr.message.includes('port is already allocated')) {
              log.info('port is already allocated - attempting again');
              return attemptDockerRun();
            }

            cb(runErr);
          });
          return;
        }

        cb(null, watchedRepo, containerRowId, hostPort, stdout);
      });
    }
    attemptDockerRun();
  });

  // update reference for container
  waterfallSteps.push((watchedRepo, containerRowId, hostPort, containerId, cb) => {
    const DatabaseTable = require('conjure-core/classes/DatabaseTable');
    const containerDomain = `c${containerUid}.${config.app.web.domain}`;
    DatabaseTable.update('container', {
      domain: containerDomain,
      port: hostPort,
      container_id: containerId,
      is_active: true,
      active_start: new Date(),
      updated: new Date()
    }, {
      id: containerRowId
    }, err => {
      cb(err, containerDomain);
    });
  });

  const waterfall = require('conjure-core/modules/async/waterfall');
  waterfall(waterfallSteps, (err, containerDomain) => {
    callback(err, containerDomain);
  });
}

module.exports = containerCreate;
