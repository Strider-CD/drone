var tmp = require('tmp')
var lodash = require('lodash')
var async = require('async')
var StreamSplitter = require('stream-splitter')
var Wreck = require('wreck')
var shell = require('shelljs')
var config = require('config')
var exec = require('child_process').exec

var wreck = Wreck.defaults({
  json: true
})

module.exports = function (emitter, client) {
  installIntoWorkflow(emitter)
  emitter.on('workflow.registeredEvent.runner.local', localRunner)

  var lineNumber = 1
  var stdout = {}
  var stderr = {}
  var workDirectory = null

  function localRunner (job, cb) {
    lineNumber = 1
    stdout = {}
    stderr = {}
    workDirectory = null

    if (!job.triggerInfo.hasOwnProperty('cmds')) {
      cb(null, null) // nothing to do here
      return
    }
    var execEnv = ''
    if (job.triggerInfo.hasOwnProperty('cmdsEnv')) {
      var envArray = job.triggerInfo.cmdsEnv.split(' ')
      envArray.forEach(function (elem, index, array) {
        entry = elem.split('=')
        if (entry.length === 2) {
          env[entry[0]] = entry[1]
        }
      })
    }
    var workDirEnv = env['DRONE_WORK_DIR']
    // if (workDirEnv) workDirectory = tmp.dirSync({dir: workDirEnv, prefix: 'drone-build-', unsafeCleanup: false})
    // else workDirectory = tmp.dirSync({prefix: 'drone-build-', unsafeCleanup: false})
    if (workDirEnv) workDirectory = tmpDir({dir: workDirEnv, prefix: 'drone-build'}, job.id)
    else workDirectory = tmpDir({prefix: 'drone-build'}, job.id)
    shell.mkdir('-p', workDirectory)
    console.log('we are now in', ls(workDirectory))

    var cloneUrl = 'https://github.com/' + job.triggerInfo.data.user + '/' + job.triggerInfo.data.repo
    var cloneCmd = 'git clone --depth 1 ' + cloneUrl + ' .' // shallow clone (truncate history)

    var cmds = [cloneCmd].concat(job.triggerInfo.cmds)
    var cmdList = cmds.join(' && ')
    cmds = [execEnv + ' /bin/bash -c ' + "'" + cmdList + "'"]
    cmds = cmds.map(function (cmd) {
      return function (callback) {
        runCmd(cmd, job, workDirectory, callback)
      }
    })
    console.log('cmds', cmds)
    async.series(cmds, function (err, res) {
      if (err) {
        if (err.hasOwnProperty('canceled')) {
          job.status = 'aborted'
          job.result = 'failed'
          returnCode = -1
        } else if (err.hasOwnProperty('failed')) {
          job.status = 'finished'
          job.result = 'failed'
          returnCode = -1
        }
      } else {
        job.status = 'finished'
        job.result = 'success'
        returnCode = 0
      }
      job.stdout = stdout
      job.stderr = stderr
      console.log('finished job', job)
      client.write({room: job.id, 'msg': { type: 'control', save: true, 'returnCode': returnCode }})
      client.write({action: 'leave', room: job.id})
      rm('-rf', workDirectory)
      Wreck.put(config.coreUrl + '/api/v1/jobs/id/' + job.id, {payload: JSON.stringify(job)}, function (err, res, payload) {
        if (err) {
          console.log('failed to upload updated job to core', err)
          return
        }
        console.log('result of upload', res)
        cb(null, job)
      })
    })
  }

  function runCmd (cmd, job, workDirectory, callback) {
    var child = exec(cmd, {cwd: workDirectory, maxBuffer: 500 * 1024})

    var splitStreamStdout = child.stdout.pipe(StreamSplitter('\n'))
    var splitStreamStderr = child.stderr.pipe(StreamSplitter('\n'))

    splitStreamStdout.on('token', function (line) {
      var line = line.toString()
      console.log(line)
      stdout[lineNumber] = line
      client.write({
        'room': job.id,
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
      stderr[lineNumber] = line
      client.write({
        'room': job.id,
        'msg': {
          'type': 'stdout',
          'line': line,
          'lineNumber': lineNumber
        }
      })
      lineNumber++
    })

    child.on('exit', function (returnCode) {
      console.log('cmd: ', cmd)
      console.log('return code: ', !(returnCode))
      callback(null, null)
    })
  }
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    'job.new',
    'workflow.registeredEvent.runner.local',
    400,
    function (err, res) {})
}

function tmpDir (config, name) {
  var dirName = ''
  if (config.hasOwnProperty('baseDir')) {
    dirName = config.baseDir
  } else {
    dirName = '/tmp'
  }
  if (config.hasOwnProperty('prefix')) {
    dirName = '/tmp/' + config.prefix + name
  } else {
    dirName = '/tmp/' + name
  }
  return dirName
}
