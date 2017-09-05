# Conjure Worker

Conjure MQ worker codebase

## Running it

You must use a process arg to define the subscription notation. Wildcards (`*`) are allowed.

E.g.

```bash
CONJURE_SUBSCRIPTION_NOTATION='food.dinner.pizza' yarn start
CONJURE_SUBSCRIPTION_NOTATION='food.dinner.*' yarn start
CONJURE_SUBSCRIPTION_NOTATION='*' yarn start
CONJURE_SUBSCRIPTION_NOTATION='*.*.pizza' yarn start
CONJURE_SUBSCRIPTION_NOTATION='#.pizza' yarn start
```

As per [RabbitMQ's convention for topic names](https://www.rabbitmq.com/tutorials/tutorial-five-python.html):

`*` can substitute for exactly one word

`#` can substitute for zero or more words
