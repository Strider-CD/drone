'use strict'

var Primus = require('primus')
var Rooms = require('primus-rooms')
var config = require('config')
var Wreck = require('wreck')
var workflowHandler = require('./lib/eventHandlers/workflow.js')
var jobSourceCorePoller = require('./lib/jobSources/corePoller.js')

var EventEmitter = require('eventemitter3')
var spawn = require('child_process').spawn
var StreamSplitter = require('stream-splitter')
var tmp = require('tmp')
var yaml = require('js-yaml')
var fs = require('fs')
require('shelljs/global')

var pollingInterval = 1000
var token = null

if(!(config.coreAPIToken)) {
  if(config.coreAPIToken.length === 0) {
    process.exit(1) 
  }
}

var socket = new Primus.createSocket()
var client = socket(config.coreUrl + '?token=' + config.coreAPIToken)

var jobRunnerStatus = 'done'

var emitter = new EventEmitter()

var startDir = new workflowHandler(emitter)
jobSourceCorePoller(emitter, pollingInterval)

var plugins = require('./lib/plugins')
plugins(emitter, client)

var basicHeader = function (username, password) {
  return 'Basic ' + (new Buffer(username + ':' + password, 'utf8')).toString('base64')
}

console.log('using token', config.coreAPIToken)

var options = {
  headers: {Authorization: config.coreAPItoken},
  timeout: 1000, // 1 second, default: unlimited
  maxBytes: 1048576, // 1 MB, default: unlimited
}

// TODO: periodic token refresh (in corePoller)?

emitter.emit('auth.token', config.coreAPIToken)


if (!module.parent) {
}
