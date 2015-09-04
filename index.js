'use strict'

var Hapi = require('hapi')
var Primus = require('primus')
var Rooms = require('primus-rooms')
var config = require('config')
var server = new Hapi.Server()
var workflowHandler = require('./lib/eventHandlers/workflow.js')
var jobSourceCorePoller = require('./lib/jobSources/corePoller.js')

var EventEmitter = require('eventemitter3')
var spawn = require('child_process').spawn
var StreamSplitter = require('stream-splitter')
var tmp = require('tmp')
var yaml = require('js-yaml')
var fs = require('fs')
require('shelljs/global')

server.connection({
  port: config.port
})

var pollingInterval = 1000

var primus = new Primus(server.listener)
var client = primus.Socket(config.coreUrl)

var jobRunnerStatus = 'done'

var emitter = new EventEmitter()

var startDir = new

workflowHandler(emitter)
jobSourceCorePoller(emitter, pollingInterval)

var plugins = require('./lib/plugins')
plugins(emitter, client)

client.on('data', function (data) {
  client.write('pong')
})

if (!module.parent) {
  server.start(function (err) {
    if (err) {
      return console.error(err)
    }

    console.log('Server started', server.info.uri)
  })
}

module.exports = server
