const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

const config = require('conjure-core/modules/config');
const log = require('conjure-core/modules/log')('express routing');

const server = express();
const { port } = config.app.worker;

server.use(compression());
server.use(morgan('combined'));
server.use(bodyParser.urlencoded({
  extended: true
}));
server.use(bodyParser.json());

const router = express.Router();
const corsOptions = {
  credentials: true,
  methods: ['POST', 'HEAD', 'OPTIONS'],
  optionsSuccessStatus: 200,
  origin: [
    config.app.api.url,
    config.app.web.url
  ],
  preflightContinue: true
};

router.options('/', cors(corsOptions));
router.post('/', cors(corsOptions), (req, res, next) => {
  console.log('FOUND');
  console.log(req.body);
  console.log(req.headers);
  res.send({
    yup: true
  });
});

// injecting a special cors handler for web
router.options('/socket.io/*', cors({
  credentials: false,
  optionsSuccessStatus: 200,
  origin: '*',
  preflightContinue: true
}));
router.get('/socket.io/*', cors({
  credentials: false,
  optionsSuccessStatus: 200,
  origin: '*',
  preflightContinue: true
}), (req, res, next) => {
  console.log('something is requesting socket.io ...');
  return next();
});

server.use(router);

server.listen(port, () => {
  log.info(`listening on :${port}`);
});
