module.exports = watchedRepoRecord => {
  const getResourceName = require('../ECS/get-resource-name')
  const resourceName = getResourceName(watchedRepoRecord)
  return `conjure/${resourceName}`
}
