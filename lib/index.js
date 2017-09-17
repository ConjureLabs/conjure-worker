// log fatal exceptions
process.on('uncaughtException', err => {
  if (err.message) {
    console.error('Caught exception (message): ', err.message);
  }
  if (err.stack) {
    console.error('Caught exception (stack): ', err.stack);
  }
  if (!err.message && !err.stack) {
    console.error('Caught exception:', err);
  }

  process.nextTick(() => {
    process.exit();
  });
});

const Queue = require('conjure-core/classes/Queue');

const activatedWorkerNotation = process.env.CONJURE_WORKER_NOTATION;

if (activatedWorkerNotation === undefined) {
  throw new Error('Must set CONJURE_WORKER_NOTATION to run worker');
}

const activedWorkersHash = require('./walk.js');
const activedWorkers = Object.keys(activedWorkersHash);
const activatedWorkerNotationExpr = new RegExp('^' + activatedWorkerNotation.replace(/\./g, '\\.').replace(/\*/g, '\\w+').replace(/#/g, '.*') + '$');
const activatedPostRoutes = [];

for (let i = 0; i < activedWorkers.length; i++) {
  if (activatedWorkerNotationExpr.test(activedWorkers[i])) {
    console.log(`Activating worker ${activedWorkers[i]}`);
    const worker = require(activedWorkersHash[ activedWorkers[i] ]);

    // if it's a route handler, then expose it
    if (typeof worker === 'function') {
      activatedPostRoutes.push({
        url: '/' + activedWorkers[i].replace(/\./g, '/'),
        handler: worker
      });
    }
  }
}

require('./express')(activatedPostRoutes);
