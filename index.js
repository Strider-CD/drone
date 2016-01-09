'use strict'

var Primus = require('primus')
var config = require('config')
var workflowHandler = require('./lib/eventHandlers/workflow.js')
var jobSourceCorePoller = require('./lib/jobSources/corePoller.js')
var EventEmitter = require('eventemitter3')

var pollingInterval = 1000

if (!(config.coreAPIToken)) {
  if (config.coreAPIToken.length === 0) {
    process.exit(1)
  }
}

var socket = new Primus.createSocket() // eslint-disable-line new-cap
var client = socket(config.coreUrl + '?token=' + config.coreAPIToken)

var emitter = new EventEmitter()

workflowHandler(emitter)
jobSourceCorePoller(emitter, pollingInterval)

var plugins = require('./lib/plugins')
plugins(emitter, client)

console.log('this drone runs on: ', process.platform)
console.log('using token', config.coreAPIToken)

// TODO: periodic token refresh (in corePoller)?
emitter.emit('auth.token', config.coreAPIToken)
