const {
  EventEmitter
} = require('node:events');
const operations = new EventEmitter();
operations.on('request:created', event => console.info(`[event] request created ${event.requestId}`));
operations.on('route:planned', event => console.info(`[event] ${event.routeCount} routes planned`));
operations.on('disposal:recorded', event => console.info(`[event] disposal recorded ${event.recordId}`));
module.exports = operations;
