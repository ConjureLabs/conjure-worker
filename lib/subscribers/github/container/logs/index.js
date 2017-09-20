module.exports = (req, res, next) => {
  const { orgName, containerUid } = req.body;

  // todo: verify orgName matches up

  const Container = require('../../../../classes/Container/GitHub');
  const container = new Container();

  container.logs(containerUid, (err, emitter) => {
    if (err) {
      return next(err);
    }

    emitter.stdout.pipe(process.stdout);
    emitter.stderr.pipe(process.stderr);
    emitter.on('end', function() {
      console.log('finished');
    });
  });
};
