require('conjure-core/modules/utils/process/handle-exceptions');

// triggering mq to connect
const Queue = require('conjure-core/classes/Queue');

let activatedWorkerNotation = process.env.CONJURE_WORKER_NOTATION;

if (activatedWorkerNotation === undefined) {
  if (process.env.NODE_ENV === 'development') {
    console.log('CONJURE_WORKER_NOTATION not set, assuming watch all (development only)');
    activatedWorkerNotation = '#';
  } else {
    throw new Error('Must set CONJURE_WORKER_NOTATION to run worker');
  }
}

const activedWorkersHash = require('./walk.js');
const activedWorkers = Object.keys(activedWorkersHash);
const activatedWorkerNotationExpr = new RegExp('^' + activatedWorkerNotation.replace(/\./g, '\\.').replace(/\*/g, '\\w+').replace(/#/g, '.*') + '$');
const activatedPostRoutes = [];

for (let i = 0; i < activedWorkers.length; i++) {
  if (activatedWorkerNotationExpr.test(activedWorkers[i])) {
    const worker = require(activedWorkersHash[ activedWorkers[i] ]);

    // if it's a route handler, then expose it
    if (typeof worker === 'function') {
      activatedPostRoutes.push({
        url: '/' + activedWorkers[i].replace(/\./g, '/'),
        handler: worker
      });
      console.log(`Activating direct call worker ${activedWorkers[i]}`);
    } else {
      console.log(`Activating queue worker ${activedWorkers[i]}`);
    }
  }
}

require('./express').setRoutes(activatedPostRoutes).listen();
