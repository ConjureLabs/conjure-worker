const Queue = require('conjure-core/classes/Queue');

const subscriptionNotation = process.env.CONJURE_SUBSCRIPTION_NOTATION;

if (subscriptionNotation === undefined) {
  throw new Error('Must set CONJURE_SUBSCRIPTION_NOTATION to run worker');
}

const subscribersHash = require('./walk.js');
const subscribers = Object.keys(subscribersHash);
const subscriptionNotationExpr = new RegExp('^' + subscriptionNotation.replace(/\./g, '\\.').replace(/\*/g, '\\w+').replace(/#/g, '.*') + '$');

for (let i = 0; i < subscribers.length; i++) {
  if (subscriptionNotationExpr.test(subscribers[i])) {
    console.log(`Subscribing to ${subscribers[i]}`);
    require(subscribersHash[ subscribers[i] ]);
  }
}
