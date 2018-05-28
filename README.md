<p align="center">
  <kbd>w o r k e r</kbd>
</p>

# Conjure Worker

Conjure worker codebase

## Queue Workers

Queues allow workers to work on tasks as they come in, one at a time.

We use Redis, with [Kue](https://github.com/Automattic/kue) for queue workers.

Make sure you have [Redis installed](https://redis.io/topics/quickstart), and then run `redis-server` in a terminal.

Development works with the default connection setup.

### /subscribers/github/container/create/index.js

```js
const Queue = require('conjure-core/classes/Queue');

const queue = new Queue('defaultExchange', 'repos', 'github.container.create');

queue.subscribe((err, message) => {
  if (err) {
    // todo: deal w/ errors, and possibly requeue + ack?
    throw err;
  }

  if (!message.body.content) {
    throw new Error('Expected message.body.content');
  }

  /*
    process the queue item
    then call message.ack();
   */
});
```

## Called Workers

This codebase also supports directly-called workers. Meaning they do not queues, the calleer must know what server the worker resides on, and will call it directly.

### /subscribers/github/container/logs/index.js

```js
const route = (req, res, next) => {
  // ...
};

// must export a route handler
module.exports = route;

// the route will only be available via POST to /github/container/logs/
```

## Running it

You must use a process arg to define the subscription notation. Wildcards (`*`) are allowed.

E.g.

```bash
CONJURE_WORKER_NOTATION="food.dinner.pizza" yarn run dev
CONJURE_WORKER_NOTATION="food.dinner.*" yarn run dev
CONJURE_WORKER_NOTATION="*" yarn run dev
CONJURE_WORKER_NOTATION="*.*.pizza" yarn run dev
CONJURE_WORKER_NOTATION="#.pizza" yarn run dev
```

As per [RabbitMQ's convention for topic names](https://www.rabbitmq.com/tutorials/tutorial-five-python.html):

`*` can substitute for exactly one word

`#` can substitute for zero or more words

## BeeQueue

We use [BeeQueue](https://github.com/bee-queue/bee-queue) with Redis to handle our queues. Make sure you have Redis running.

```sh
redis-server
```

## Troubleshooting

If you get this error:

```
github.container.create -->  Error: Build template script exited with code 1
    at ChildProcess.buildTemplate.on.code (/Users/mars/tmarshall/conjure-worker/lib/classes/Container/create.js:202:25)
    at emitTwo (events.js:125:13)
    at ChildProcess.emit (events.js:213:7)
    at Process.ChildProcess._handle.onexit (internal/child_process.js:200:12)
    github.container.create -->  Error: Build template script exited with code 1
    at ChildProcess.buildTemplate.on.code (/Users/mars/tmarshall/conjure-worker/lib/classes/Container/create.js:202:25)
    at emitTwo (events.js:125:13)
    at ChildProcess.emit (events.js:213:7)
```

Then you have to make sure docker is running locally.

First make sure that the default machine is created. It's often not, on MacOS.

```sh
docker-machine start
```

If that gives you `Error: No machine name(s) specified and no "default" machine exists` then run:

```sh
docker-machine create default
```

Now, you can set env vars needed:

```sh
eval "$(docker-machine env default)"
```

## Fresh server setup

Must be an Ubuntu EC2

1. `ssh-keygen` _(do not do this on your local...)_
2. save public key as a deploy key on repo, on github
3. `git clone git@github.com:ConjureLabs/conjure-worker.git`
4. `sudo apt update`
5. `sudo apt-get install postgresql postgresql-contrib redis-tools`
6. `sudo apt-get install apt-transport-https ca-certificates curl software-properties-common`
7. `curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -`
8. `sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"`
9. `sudo apt-get update`
10. `sudo apt-get install docker-ce`
11. `sudo -E usermod -a -G docker $USER`
12. disconnect from ssh, & reconnect
13. `curl -sL https://deb.nodesource.com/setup_10.x | sudo bash -`
14. `sudo apt-get install -y nodejs`
15. `sudo -E npm i -g yarn`
16. `sudo -E npm i -g pm2`
17. `sudo chown -R $USER:$(id -gn $USER) /home/ubuntu/.config `
18. in proj dir, save `.hob/.env`
19. in proj dir, `yarn install`
20. in proj dir, `pm2 start ./bash/pm2/conjure-worker.sh --name "conjure-worker"`
