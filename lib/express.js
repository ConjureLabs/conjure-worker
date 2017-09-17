module.exports = postRoutes => {
  // only kick up express if we really need to
  if (!postRoutes.length) {
    return;
  }

  const express = require('express');
  const compression = require('compression');
  const morgan = require('morgan');
  const cors = require('cors');
  const config = require('conjure-core/modules/config');
  const log = require('conjure-core/modules/log')('express routing');

  const port = process.env.CONJURE_WORKER_PORT;
  const server = express();
  const router = express.Router();

  const corsOptions = {
    credentials: true,
    methods: ['POST', 'HEAD', 'OPTIONS'],
    optionsSuccessStatus: 200,
    origin: [
      config.app.api.url
    ],
    preflightContinue: true
  };

  server.use(compression());
  server.set('port', port);
  server.use(morgan('combined'));

  for (let i = 0; i < postRoutes.length; i++) {
    router.options(postRoutes[i].url, cors(corsOptions));
    router.post(postRoutes[i].url, cors(corsOptions), postRoutes[i].handler);
  }

  server.use(router);

  server.listen(port, () => {
    log.info(`listening on :${port}`);
  });
};
