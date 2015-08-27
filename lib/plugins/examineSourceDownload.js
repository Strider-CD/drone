var tmp = require('tmp')
var yaml = require('js-yaml')
var fs = require('fs')
var tmpDir = require('../tmpDir.js')
var shell = require('shelljs')

var examineSourceDownloadEvent = 'workspace.registeredEvent.examineSource.download'
var domain = 'job.new'

module.exports = function (emitter) {
  installIntoWorkflow(emitter)
  emitter.on(examineSourceDownloadEvent, examineSourceDownload)
  emitter.on(examineSourceDownloadEvent + '.cleanup', examineSourceCleanup)

  function examineSourceDownload (job, cb) {
    if (job.trigger === 'github') {
      var workDirEnv = env['DRONE_WORK_DIR']
      var workDirectory
      if (workDirEnv) workDirectory = tmpDir({dir: workDirEnv, prefix: 'drone-examineSource-'}, job.id)
      else workDirectory = tmpDir({prefix: 'drone-examineSource-'}, job.id)
      shell.mkdir('-p', workDirectory)
      console.log('we are now in', shell.ls(workDirectory))

      //var workDirectory = {name: '/tmp/drone-examineSource-8274v6rRUd581qFO'}

      var cloneUrl = 'https://github.com/' + job.triggerInfo.data.user + '/' + job.triggerInfo.data.repo
      var cloneCmd = 'git clone --depth 1 ' + cloneUrl + ' .' // shallow clone (truncate history)
      //var cloneCmd = 'touch tmpfile.txt'
      shell.pushd(workDirectory)
      shell.exec(cloneCmd, function (code, output) {
        console.log('executed')
        if (code === 0) {
          console.log('return positve')
          cb(null, job)
        } else {
          console.log('download failed')
          cb('examineSourceDownload failed', null)
        }
      })
      shell.popd()
      rm('-rf', workDirectory)
    }
    if (job.trigger === 'rest') {
      // nothing to do here
      console.log('received rest job')
      cb(null, job)
    }
  }

  function examineSourceDownloadCleanup (job, cb) {
    var workDirEnv = env['DRONE_WORK_DIR']
    var workDirectory
    if (workDirEnv) workDirectory = tmpDir({dir: workDirEnv, prefix: 'drone-examineSource-'}, job.id)
    else workDirectory = tmpDir({prefix: 'drone-examineSource-'}, job.id)
    if(fs.existsSync(workDirectory)) {
      shell.rm('-rf', workDirectory)
    }
    cb(null, job)
  }
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    domain,
    examineSourceDownloadEvent,
    100,
    function (err, res) {
      //console.log(err, res)
    })
}

function installIntoWorkflowCleanup (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    domain,
    examineSourceDownloadEvent + '.cleanup',
    900,
    function (err, res) {
      //console.log(err, res)
    })
}
