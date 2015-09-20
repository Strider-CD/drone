'use strict'

var Hapi = require('hapi')
var Primus = require('primus')
var Rooms = require('primus-rooms')
var config = require('config')
var Wreck = require('wreck')
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
var token = null

var primus = new Primus(server.listener)
var client = primus.Socket(config.coreUrl)

var jobRunnerStatus = 'done'

var emitter = new EventEmitter()

var startDir = new workflowHandler(emitter, token)
jobSourceCorePoller(emitter, pollingInterval)

var plugins = require('./lib/plugins')
plugins(emitter, client)

var basicHeader = function (username, password) {
  return 'Basic ' + (new Buffer(username + ':' + password, 'utf8')).toString('base64')
}

var options = {
  headers: {authorization: basicHeader(config.droneUser, config.dronePwd)},
  timeout: 1000, // 1 second, default: unlimited
  maxBytes: 1048576, // 1 MB, default: unlimited
}

var req = Wreck.request('GET', config.coreUrl + '/api/v1/drones/checkin', options, function (err, res) {
  if (err) return console.error('Authentication error: ', err)
  if (res.statusCode !== 200) return console.error('Authentication error')
  if (!(res.headers.authorization)) return console.error('Authentication error')
  token = res.headers.authorization
  emitter.emit('auth.token', token)
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
