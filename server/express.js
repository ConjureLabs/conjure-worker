const log = require('conjure-core/modules/log')('express routing')

let server // cached

function getServer() {
  if (server) {
    return server
  }

  const express = require('express')
  const compression = require('compression')
  const morgan = require('morgan')
  const bodyParser = require('body-parser')

  server = express()

  server.use(compression())
  server.use(morgan('combined'))
  server.use(bodyParser.urlencoded({
    extended: true
  }))
  server.use(bodyParser.json())

  return server
}
module.exports.getServer = getServer

module.exports.setRoutes = postRoutes => {
  // only kick up express if we really need to
  if (!postRoutes.length) {
    return
  }

  const server = getServer()

  const cors = require('cors')
  const express = require('express')
  const config = require('conjure-core/modules/config')

  const router = express.Router()
  const corsOptions = {
    credentials: true,
    methods: ['POST', 'HEAD', 'OPTIONS'],
    optionsSuccessStatus: 200,
    origin: [
      config.app.api.url,
      config.app.web.url
    ],
    preflightContinue: true
  }

  for (let i = 0; i < postRoutes.length; i++) {
    router.options(postRoutes[i].url, cors(corsOptions))
    router.post(postRoutes[i].url, cors(corsOptions), postRoutes[i].handler)
  }

  // injecting a special cors handler for web
  router.options('/socket.io/*', cors({
    credentials: false,
    optionsSuccessStatus: 200,
    origin: '*',
    preflightContinue: true
  }))
  router.get('/socket.io/*', cors({
    credentials: false,
    optionsSuccessStatus: 200,
    origin: '*',
    preflightContinue: true
  }), (req, res, next) => {
    console.log('something is requesting socket.io ...')
    return next()
  })

  server.use(router)

  return module.exports
}

module.exports.listen = () => {
  const server = getServer()
  const port = process.env.CONJURE_WORKER_PORT

  const serverListening = server.listen(port, () => {
    log.info(`listening on :${port}`)
  })

  require('./ws').listen(serverListening)

  return module.exports
}
