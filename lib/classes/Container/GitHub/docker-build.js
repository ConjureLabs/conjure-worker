const { UnexpectedError } = require('@conjurelabs/err')
const config = require('conjure-core/modules/config')
const log = require('conjure-core/modules/log')('container.github.docker-build')

module.exports = function dockerBuild() {
  return new Promise(async resolve => {
    const repoConfig = await this.getConfig()

    // create dockerfile from templates
    const languages = repoConfig.machine.languages
    const languageNames = Object.keys(languages)

    // todo: need to handle if the user enters a version we do not support
    const templatesNeeded = languageNames.reduce((templates, languageName) => {
      templates.push(`/${languageName}/${languageName}-${languages[languageName].version}`)
      return templates
    }, ['base'])

    const dockerfileTemplateName = await buildDockerfileTemplate(templatesNeeded)

    // create container
    let preSetupSteps = ''

    if (repoConfig.machine.pre.length) {
      preSetupSteps = repoConfig.machine.pre
        .map(command => {
          return `RUN ${command}`
        })
        .join('\n')
      preSetupSteps = new Buffer(preSetupSteps).toString('base64')
    }

    const gitHubAccount = await this.payload.getGitHubAccount()
    const watchedRepo = await this.payload.getWatchedRepoRecord()

    const {
      orgName,
      repoName,
      branch
    } = this.payload

    const containerUid = await buildProject(gitHubAccount.access_token, watchedRepo, orgName, repoName, branch, dockerfileTemplateName, preSetupSteps, repoConfig.machine.setup, repoConfig.machine.start)

    resolve(containerUid)
  })
}

function buildDockerfileTemplate(templatesNeeded) {
  return new Promise((resolve, reject) => {
    // for each template dockerfile we need to generate (that will be a `FROM ...` at top of the project dockerfile) we need to build it
    function buildTemplatePart(lastTemplateSubname) {
      const current = templatesNeeded.shift()
      const fromTemplate = arguments.length > 0 ? `conjure:${lastTemplateSubname}` : ''

      if (current === undefined) {
        return resolve(fromTemplate)
      }

      // `conjure:base` will _always_ be the first generated
      // `conjure:node-v8` is an example of the next in line ('base' is removed from template name, to be clear)
      // `conjure:node-v8_____java-oracle-java-8` is what another build would look like (would include node & java)
      const newTemplateSubname = arguments.length === 0 ? 'base' :
        lastTemplateSubname === 'base' ? current.split('/').pop() :
        `${lastTemplateSubname}_____${current.split('/').pop()}` // _s used to signify a chain of languages

      const templateName = `conjure:${newTemplateSubname}`

      const path = require('path')
      const command = [
        'bash',
        './build/dockerfile-template.sh',
        `${current}.Dockerfile`,
        `${templateName}`,
        `${fromTemplate}`
      ]

      if (process.env.NODE_ENV === 'development') {
        log.info(command.join(' '))
      }

      const spawn = require('child_process').spawn
      const buildTemplate = spawn(command[0], command.slice(1), {
        cwd: path.resolve(__dirname, '..', '..', '..', 'git-container')
      })

      if (process.env.NODE_ENV === 'development') {
        buildTemplate.stdout.on('data', data => {
          console.log(data.toString())
        })

        buildTemplate.stderr.on('data', data => {
          console.log(data.toString())
        })
      }

      buildTemplate.on('exit', code => {
        if (code !== 0) {
          return reject(new UnexpectedError(`Build template script exited with code ${code}`))
        }

        buildTemplatePart(newTemplateSubname)
      })
    }
    buildTemplatePart()
  })
}

function buildProject(gitHubToken, watchedRepo, orgName, repoName, branch, templateName, preSetupSteps, machineSetup = ':' /* : is bash noOp */, startCommand = 'exit 1' /* exit w/ error if no start given */) {
  return new Promise((resolve, reject) => {
    const path = require('path')
    const uid = require('uid')
    
    const containerUid = uid(24)

    const command = [
      'bash',
      './build/project.sh',
      templateName,
      `https://${gitHubToken}:x-oauth-basic@github.com/${orgName}/${repoName}.git`,
      branch,
      containerUid,
      `conjure/${config.aws.ecs.fargate.prefix}${watchedRepo.id}`,
      `${config.aws.account.id}.dkr.ecr.${config.aws.default.region}.amazonaws.com/`,
      // `${containerUid}`,
      preSetupSteps,
      machineSetup,
      startCommand
    ]

    if (process.env.NODE_ENV === 'development') {
      log.info(command.join(' '))
    }

    const spawn = require('child_process').spawn
    const buildProjectProcess = spawn(command[0], command.slice(1), {
      cwd: path.resolve(__dirname, '..', '..', '..', 'git-container')
    })

    if (process.env.NODE_ENV === 'development') {
      buildProjectProcess.stdout.on('data', data => {
        console.log(data.toString())
      })

      buildProjectProcess.stderr.on('data', data => {
        console.log(data.toString())
      })
    }

    buildProjectProcess.on('exit', code => {
      if (code !== 0) {
        return reject(new UnexpectedError(`Build project script exited with code ${code}`))
      }

      resolve(containerUid)
    })
  })
}
