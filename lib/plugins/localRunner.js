var tmp = require('tmp')
var lodash = require('lodash')
var async = require('async')
var StreamSplitter = require('stream-splitter')
var Wreck = require('wreck')
var shell = require('shelljs')
var config = require('config')
var exec = require('child_process').exec
var logger = require('../util/log.js')(module)

var wreck = Wreck.defaults({
  json: true
})

var token = config.coreAPIToken

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
      cb(null, job) // nothing to do here
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
    if (workDirEnv) workDirectory = tmpDir({dir: workDirEnv, prefix: 'drone-build-'}, job.id)
    else workDirectory = tmpDir({prefix: 'drone-build-'}, job.id)
    shell.mkdir('-p', workDirectory)

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
    logger.info('job.id ' + job.id + ' will run cmds')
    async.series(cmds, function (err, res) {
      var returnCode = -1
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
      logger.info('job.id ' + job.id + ' finished with status: ' + job.result)
      // client.write({room: job.id, 'msg': { type: 'control', save: true, 'returnCode': returnCode }})
      client.write({room: job.id, type: 'leave', msg: {}})
      shell.rm('-rf', workDirectory)
      Wreck.put(config.coreUrl + '/api/v1/jobs/id/' + job.id, {
        payload: JSON.stringify(job),
        'headers': {'authorization': token}
      }, function (err, res, payload) {
        if (res.statusCode !== 200) {
          logger.warn('failed to upload updated job to core')
        }
        if (err) {
          logger.warn('failed to upload updated job to core', err)
          return
        }
        cb(null, job)
      })
    })
  }

  function runCmd (cmd, job, workDirectory, callback) {
    client.write({room: job.id, type: 'join', msg: {}})
    var child = exec(cmd, {cwd: workDirectory, maxBuffer: 500 * 1024})

    var splitStreamStdout = child.stdout.pipe(StreamSplitter('\n'))
    var splitStreamStderr = child.stderr.pipe(StreamSplitter('\n'))

    splitStreamStdout.on('token', function (line) {
      var line = line.toString()
      logger.info(line)
      stdout[lineNumber] = line
      client.write({
        'room': job.id,
        'type': 'stdout',
        'msg': {
          'line': line,
          'lineNumber': lineNumber
        }
      })
      lineNumber++
    })

    splitStreamStderr.on('token', function (line) {
      var line = line.toString()
      logger.info(line)
      stderr[lineNumber] = line
      client.write({
        'room': job.id,
        'type': 'stderr',
        'msg': {
          'line': line,
          'lineNumber': lineNumber
        }
      })
      lineNumber++
    })

    child.on('exit', function (returnCode) {
      var err = undefined
      if (!returnCode) {
        callback(null, null) // zero return value -> success
      } else {
        callback({failed: true}, null) // non-zero return value -> cmd failed
      }
    })
  }
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    'job.new',
    'workflow.registeredEvent.runner.local',
    400,
    function (err, res) {})
  emitter.on('auth.token', function (newToken) {
    token = newToken
  })
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
