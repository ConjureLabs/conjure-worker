const Queue = require('conjure-core/classes/Queue')
const IssueComment = require('conjure-core/classes/GitHub/IssueComment')
const log = require('conjure-core/modules/log')('github.container.unavailable')

const queue = new Queue('container.unavailable', true)

queue.subscribe(async (jobData, done) => {
  if (!jobData.content) {
    log.error(`Job ${jobData.id}, in container.unavailable, had no body.content`)
    return done(new Error('Expected jobData.content'))
  }

  const GitHubWebhookPayload = require('conjure-core/classes/Repo/GitHub/Webhook/Payload')
  const payload = new GitHubWebhookPayload(jobData.content)

  const { orgName, repoName, branch } = payload

  log.info(`removing container available message, on GitHub (${orgName}/${repoName} --> ${branch})`)
  const issueComment = new IssueComment(payload)
  await issueComment.delete()

  log.info(`removed container available message, on GitHub (${orgName}/${repoName} --> ${branch})`)
  done()
})
