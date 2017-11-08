const { ContentError, UnexpectedError } = require('conjure-core/modules/err');
const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('container create');

let workerPort = parseInt(process.env.CONJURE_CONTAINER_STARTING_PORT, 10);

async function containerCreate(callback) {
  log.info('starting create');

  const {
    branch,
    orgName,
    repoName
  } = this.payload;

  const uid = require('uid');

  const containerUid = uid(24);
  
  // get watched repo record
  const watchedRepo = await this.payload.getWatchedRepoRecord();

  // make sure the repo/branch is not already spun up
  const DatabaseTable = require('conjure-core/classes/DatabaseTable');
  const duplicateActiveContainers = await DatabaseTable.select('container', {
    repo: watchedRepo.id,
    branch: branch,
    is_active: true
  });
  if (duplicateActiveContainers.length) {
    return duplicateActiveContainers[0].url_uid;
  }

  // get github client
  const gitHubAccount = await this.payload.getGitHubAccount();
  if (!gitHubAccount) {
    throw new ContentError('No github account record found');
  }
  const github = require('octonode');
  const gitHubClient = github.client(gitHubAccount.access_token);

  // get yml config
  const repoConfig = await getProjectYml(gitHubClient, orgName, repoName);

  if (repoConfig.machine.start === null) {
    trhow new ContentError('No container start command defined or known');
  }

  // create record for container
  const insertedContainer = await DatabaseTable.insert('container', {
    repo: watchedRepo.id,
    branch: branch,
    url_uid: containerUid,
    is_active: true,
    added: new Date()
  });

  if (!Array.isArray(insertedContainer) || !insertedContainer.length) {
    throw UnexpectedError('Container record failed to insert');
  }

  // create dockerfile from templates
  const languages = repoConfig.machine.languages;
  const languageNames = Object.keys(languages);

  // todo: need to handle if the user enters a version we do not support
  const templatesNeeded = languageNames.reduce((templates, languageName) => {
    templates.push(`/${languageName}/${languageName}-${languages[languageName].version}`);
    return templates;
  }, ['base']);

  const dockerfileTemplateName = await buildDockerfileTemplate(templatesNeeded);

  // create container
  // todo: handle non-github repos
  const spawn = require('child_process').spawn;

  let preSetupSteps = '';

  if (repoConfig.machine.pre.length) {
    preSetupSteps = repoConfig.machine.pre
      .map(command => {
        return `RUN ${command}`;
      })
      .join('\n');
    preSetupSteps = new Buffer(preSetupSteps).toString('base64');
  }

  await buildProject(gitHubAccount.access_token, orgName, repoName, branch, containerUid, templateName, preSetupSteps, repoConfig.machine.setup);
  const containerId = await runProject(repoConfig, containerUid);

  // update reference for container
  await DatabaseTable.update('container', {
    domain: `c${containerUid}.${config.app.web.domain}`,
    port: hostPort,
    container_id: containerId,
    is_active: true,
    active_start: new Date(),
    updated: new Date()
  }, {
    id: containerRowId
  });

  return containerUid;
}

function getProjectYml(gitHubClient, orgName, repoName) {
  return new Promise((resolve, reject) => {
    gitHubClient
      .repo(`${orgName}/${repoName}`)
      .contents('conjure.yml', branch, (err, file) => {
        if (
          (err && err.message === 'Not Found') ||
          (!file || file.type !== 'file' || typeof file.content !== 'string')
        ) {
          return reject(new ContentError('No Conjure YML config present in repo'));
        }

        if (err) {
          return reject(err);
        }

        const yml = new Buffer(file.content, 'base64');
        const Config = require('conjure-core/classes/Repo/Config');
        const ymlContent = new Config(yml);

        if (ymlContent.valid === false) {
          return reject(new ContentError('Invalid Conjure YML config'));
        }

        resolve(ymlContent);
      });
  });
}

function buildDockerfileTemplate(templatesNeeded) {
  return new Promise((resolve, reject) => {
    // for each template dockerfile we need to generate (that will be a `FROM ...` at top of the project dockerfile) we need to build it
    function buildTemplatePart(lastTemplateSubname) {
      const spawn = require('child_process').spawn;

      const current = templatesNeeded.shift();
      const fromTemplate = arguments.length > 0 ? `conjure:${lastTemplateSubname}` : '';

      if (current === undefined) {
        return resolve(fromTemplate);
      }

      // `conjure:base` will _always_ be the first generated
      // `conjure:node-v8` is an example of the next in line ('base' is removed from template name, to be clear)
      // `conjure:node-v8_____java-oracle-java-8` is what another build would look like (would include node & java)
      const newTemplateSubname = arguments.length === 0 ? 'base' :
        lastTemplateSubname === 'base' ? current.split('/').pop() :
        `${lastTemplateSubname}_____${current.split('/').pop()}`; // _s used to signify a chain of languages

      const templateName = `conjure:${newTemplateSubname}`;

      const path = require('path');
      const command = [
        'bash',
        './build/dockerfile-template.sh',
        `${current}.Dockerfile`,
        `${templateName}`,
        `${fromTemplate}`
      ];

      if (process.env.NODE_ENV === 'development') {
        log.info(command.join(' '));
      }

      const buildTemplate = spawn(command[0], command.slice(1), {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      });

      if (process.env.NODE_ENV === 'development') {
        buildTemplate.stdout.on('data', data => {
          console.log(data.toString());
        });

        buildTemplate.stderr.on('data', data => {
          console.log(data.toString());
        });
      }

      buildTemplate.on('exit', code => {
        if (code !== 0) {
          const UnexpectedError = require('conjure-core/modules/err').UnexpectedError;
          return reject(new UnexpectedError(`Build template script exited with code ${code}`));
        }

        buildTemplatePart(newTemplateSubname);
      });
    }
    buildTemplatePart();
  });
}

function buildProject(gitHubToken, orgName, repoName, branch, containerUid, templateName, preSetupSteps, repoConfig.machine.setup = ':' /* : is bash noOp */) {
  return new Promise((resolve, reject) => {
    const path = require('path');
    const command = [
      'bash',
      './build/project.sh',
      `${templateName}`,
      `https://${gitHubToken}:x-oauth-basic@github.com/${orgName}/${repoName}.git`,
      `${branch}`,
      `${containerUid}`,
      `${preSetupSteps}`,
      `${repoConfig.machine.setup || bashNoOp}`
    ];

    if (process.env.NODE_ENV === 'development') {
      log.info(command.join(' '));
    }

    const buildProject = spawn(command[0], command.slice(1), {
      cwd: path.resolve(__dirname, '..', '..', 'git-container')
    });

    if (process.env.NODE_ENV === 'development') {
      buildProject.stdout.on('data', data => {
        console.log(data.toString());
      });

      buildProject.stderr.on('data', data => {
        console.log(data.toString());
      });
    }

    buildProject.on('exit', code => {
      if (code !== 0) {
        const UnexpectedError = require('conjure-core/modules/err').UnexpectedError;
        return reject(new UnexpectedError(`Build project script exited with code ${code}`));
      }

      resolve();
    });
  });
}

function runProject(repoConfig, containerUid) {
  return new Promise((resolve, reject) => {
    const exec = require('conjure-core/modules/childProcess/exec');

    const hostPort = workerPort++;

    const extraEnvKeys = Object.keys(repoConfig.machine.environment);
    const extraEnvVars = !extraEnvKeys.length ? '' : extraEnvKeys
      .map(key => {
        return ` -e ${key}="${repoConfig.machine.environment[key]}"`;
      })
      .join('');

    const path = require('path');
    const command = `docker run --cidfile /tmp/${containerUid}.cid -i -t -d -p ${hostPort}:${repoConfig.machine.port}${extraEnvVars} "${containerUid}" ${repoConfig.machine.start}`;

    if (process.env.NODE_ENV === 'development') {
      log.info(command);
    }

    let stdout;

    try {
      stdout = await exec(command, {
        cwd: path.resolve(__dirname, '..', '..', 'git-container')
      });
    } catch(runErr) {
      try {
        await exec(`rm /tmp/${containerUid}.cid`);
      } catch(rmCidErr) {
        log.error(rmCidErr)

        if (runErr.message && runErr.message.includes('port is already allocated')) {
          log.info('port is already allocated - attempting again');
          try {
            stdout = runProject(repoConfig, containerUid);
          } catch (err) {
            return reject(err);
          }
          return resolve(stdout);
        }

        return reject(runErr);
      }
    }

    resolve(stdout);
  });
}

module.exports = containerCreate;
