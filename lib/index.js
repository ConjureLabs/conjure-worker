const argv = process.argv;
const isMaster = argv.includes('--master');

if (isMaster) {
  require('./master');
} else {
  require('./worker');
}
