'use strict';

var Primus = require('primus');
var config = require('config');
var EventEmitter = require('eventemitter3');
var Wreck = require('wreck');
var workflowHandler = require('./event-handlers/workflow.js');
var jobSourceCorePoller = require('./job-sources/corePoller.js');

var pollingInterval = 1000;

if (!config.droneToken) {
  if (config.droneToken.length === 0) {
    console.error('drone token invalid');
    process.exit(1);
  }
}

var socket = new Primus.createSocket(); // eslint-disable-line new-cap
var client = socket(config.coreUrl + '?token=' + config.droneToken);
var emitter = new EventEmitter();

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