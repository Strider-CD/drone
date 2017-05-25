'use strict';

const Primus = require('primus');
const config = require('config');
const EventEmitter = require('eventemitter3');
const Wreck = require('wreck');
const workflowHandler = require('./event-handlers/workflow');
const jobSourceCorePoller = require('./job-sources/corePoller');

if (!config.droneToken) {
  console.error('drone token invalid');
  process.exit(1);
}

let socket = new Primus.createSocket(); // eslint-disable-line new-cap
let client = socket(config.coreUrl + '?token=' + config.droneToken);
let emitter = new EventEmitter();

workflowHandler(emitter);
jobSourceCorePoller(emitter, pollingInterval);

var plugins = require('./plugins');
plugins(emitter, client);

console.log('this drone runs on: ', process.platform);
console.log('using token', config.droneToken);

// TODO: periodic token refresh (in corePoller)?
emitter.emit('auth.token', config.droneToken);

Wreck.post(config.coreUrl + '/api/v1/drones/checkin/' + config.droneToken, {
  headers: { Authorization: 'Bearer ' + config.droneToken }
}, function (err, res, payload) {
  console.log(err ? err : 'Activated');
  console.log(payload.toString());
});
//# sourceMappingURL=index.js.map