const Queue = require('conjure-core/classes/Queue')
const config = require('conjure-core/modules/config')
const log = require('conjure-core/modules/log')('github.container.available')

const queue = new Queue('container.available', true)

const webUrl = config.app.web.url

const gitHubCommentSignature = [
  '',
  '---',
  '',
  `__This message was generated via [<kbd>Conjure.sh</kbd>](${webUrl})__`
]

queue.subscribe(async (jobData, done) => {
  if (!jobData.content) {
    log.error(`Job ${jobData.id}, in container.available, had no body.content`)
    return done(new Error('Expected jobData.content'))
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload')
  const payload = new GitHubWebhookPayload(jobData.content)

  log.info(`posting container available message, on GitHub (${orgName}/${repoName} --> ${branch})`)

  const Issue = require('conjure-core/classes/Repo/GitHub/Issue')
  const issue = new Issue(payload)

  const containerRequestUrl = `${config.app.web.protocol}://${containerUid}.create.${config.app.web.host}`

  // commenting on issue thread to notify that an instance is spinning up
  await issue.upsertComment([
    `:ghost: [You can spin up this branch on Conjure](${containerRequestUrl})`
  ].concat(gitHubCommentSignature).join('\n'))

  log.info(`posted container available message, on GitHub (${orgName}/${repoName} --> ${branch})`)

  done()
})
