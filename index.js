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

workflowHandler(emitter)
jobSourceCorePoller(emitter, pollingInterval)

var plugins = require('./lib/plugins')
plugins(emitter)

function handleGithubResponse (response) {
  console.log('got new job', response)
  var lineNumber = 1
  response.stdout = {}
  response.stderr = {}
  //var dir = new tmp.Dir('build', { generator: false })
  var workDirEnv = env['DRONE_WORK_DIR']
  var workDirectory
  if(workDirEnv) workDirectory = tmp.dirSync({dir: workDirEnv, prefix: 'build', unsafeCleanup: true})
  else workDirectory = tmp.dirSync({prefix: 'build', unsafeCleanup: true})
  tmp.setGracefulCleanup()

  var cloneUrl = 'https://github.com/' + response.triggerInfo.data.user + '/' + response.triggerInfo.data.repo

  if (!(response.id)) return
  client.write({action: 'join', room: response.id})
  // execute tests etc.
  // ...
  pushd(workDirectory.name)
  var cloneCmd = 'git clone ' + cloneUrl + ' .'
  var checkoutBranch = 'git checkout ' + response.triggerInfo.data.ref
  if (exec(cloneCmd).code === 0 && exec(checkoutBranch).code === 0) {
    var doc = null
    try {
      doc = yaml.safeLoad(fs.readFileSync('.travis.yml', 'utf8'))
    } catch (e) {
      console.log(e)
    }
    env['TRAVIS_PULL_REQUEST'] = response.triggerInfo.data.number
    env['BUILDTEST_MCU_GROUP'] = 'avr8'
    if (doc) {
      if (doc.install.length > 1) {
        var index = 0
        index++ // hack
        for (; index < doc.install.length; index++) {
          console.log('executing: ', doc.install[index])
          exec(doc.install[index])
        }
        //  console.log("env['BUILDTEST_MCU_GROUP']",process.env)
        console.log('doc.script[0]', doc.script[0])
        var child = exec(doc.script[0], {async: true})

        var splitStreamStdout = child.stdout.pipe(StreamSplitter('\n'))
        var splitStreamStderr = child.stderr.pipe(StreamSplitter('\n'))

        splitStreamStdout.on('token', function (line) {
          var line = line.toString()
          console.log(line)
          response.stdout[lineNumber] = line
          client.write({
            'room': response.id,
            'msg': {
              'type': 'stdout',
              'line': line,
              'lineNumber': lineNumber
            }
          })
          lineNumber++
        })

        splitStreamStderr.on('token', function (line) {
          var line = line.toString()
          console.log(line)
          response.stderr[lineNumber] = line
          client.write({
            'room': response.id,
            'msg': {
              'type': 'stdout',
              'line': line,
              'lineNumber': lineNumber
            }
          })
          lineNumber++
        })

        child.on('exit', function (returnCode) {
          console.log('return code:', !(returnCode))
          client.write({room: response.id, 'msg': { type: 'control', save: true, 'returnCode': returnCode }})
          client.write({action: 'leave', room: response.id})
          response.status = 'finished'
          response.result = 'success'
          console.log('child.on exit', response)
          Wreck.put(config.coreUrl + '/api/v1/jobs/id/' + response.id, {payload: JSON.stringify(response)}, function (err, res, payload) {
            if (err) return
          })
          jobRunnerStatus = 'done'
          //dir.rmdirSync()
          console.log('workDirectory.name',workDirectory.name)
          rm('-rf', workDirectory.name)
        })
      }
    }
  }
}

client.on('data', function (data) {
  console.log(data)
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
