module.exports = watchedRepoRecord => {
  return `${process.env.NODE_ENV}-watched-${watchedRepoRecord.id}`
}
