const Queue = require('conjure-core/classes/Queue')
const config = require('conjure-core/modules/config')
const IssueComment = require('../../../../classes/GitHub/IssueComment')
const log = require('conjure-core/modules/log')('github.container.available')

const queue = new Queue('container.available', true)

queue.subscribe(async (jobData, done) => {
  if (!jobData.content) {
    log.error(`Job ${jobData.id}, in container.available, had no body.content`)
    return done(new Error('Expected jobData.content'))
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload')
  const payload = new GitHubWebhookPayload(jobData.content)

  const { orgName, repoName, branch, number } = payload

  log.info(`posting container available message, on GitHub (${orgName}/${repoName} --> ${branch})`)

  const containerRequestUrl = `${config.app.web.url}/start/${orgName}/${repoName}/${number}`
  const issueComment = new IssueComment(payload)
  await issueComment.upsert(`:ghost: [You can spin up this branch on Conjure](${containerRequestUrl})`)

  log.info(`posted container available message, on GitHub (${orgName}/${repoName} --> ${branch})`)
  done()
})
