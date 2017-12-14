<p align="center">
  <kbd>w o r k e r</kbd>
</p>

# Conjure Worker

Conjure worker codebase

## Queue Workers

Queues allow workers to work on tasks as they come in, one at a time.

We use RabbitMQ for queue workers.

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

## RabbitMQ

On MacOS? [Install it via homebrew](https://www.rabbitmq.com/install-homebrew.html).

Then, run it locally via `PATH=$PATH:/usr/local/sbin rabbitmq-server`.

Once running, you can close that tab if wanted, and it should run in the background.

If you try starting it again, and get an error of `ERROR: node with name "rabbit" already running on "localhost"`, then you're already set.

### Web Dashboard

It helps to use the [built-in management plugin](https://www.rabbitmq.com/management.html) to monitor activity.

First, make sure it's enabled. `PATH=$PATH:/usr/local/sbin rabbitmq-plugins enable rabbitmq_management`

Then, you can go to [http://localhost:15672/](http://localhost:15672/).
