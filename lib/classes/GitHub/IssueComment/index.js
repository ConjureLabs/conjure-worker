const config = require('conjure-core/modules/config')

const webUrl = config.app.web.url
const gitHubCommentSignature = [
  '',
  '---',
  '',
  `__This message was generated via [<kbd>Conjure.sh</kbd>](${webUrl})__`
]

class IssueComment {
  constructor(payload) {
    const Issue = require('conjure-core/classes/Repo/GitHub/Issue')
    this.issue = new Issue(payload)
  }

  async upsert(message) {
    const commentRow = await this.issue.upsertComment([
      message,
      ...gitHubCommentSignature
    ].join('\n'))
    return commentRow
  }

  async delete() {
    await this.issue.deleteComment()
  }
}

module.exports = IssueComment
