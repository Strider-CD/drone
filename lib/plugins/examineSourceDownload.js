var fs = require('fs')
var tmpDir = require('../util/tmpDir.js')
var shell = require('shelljs')
var logger = require('../util/log.js')(module)

var examineSourceDownloadEvent = 'workspace.registeredEvent.examineSource.download'
var domain = 'job.new'

module.exports = function (emitter) {
  installIntoWorkflow(emitter)
  installIntoWorkflowCleanup(emitter)
  emitter.on(examineSourceDownloadEvent, examineSourceDownload)
  emitter.on(examineSourceDownloadEvent + '.cleanup', examineSourceDownloadCleanup)

  function examineSourceDownload (job, cb) {
    if (job.trigger === 'github') {
      var workDirectory = tmpDir({prefix: 'drone-examineSource-'}, job.id)
      shell.mkdir('-p', workDirectory)

      var cloneUrl = 'https://github.com/' + job.triggerInfo.data.user + '/' + job.triggerInfo.data.repo
      var cloneCmd = 'git clone --depth 1 ' + cloneUrl + ' .' // shallow clone (truncate history)
      shell.pushd(workDirectory)
      shell.exec(cloneCmd, function (code, output) {
        if (code === 0) {
          cb(null, job)
        } else {
          logger.warn('download failed', output)
          cb('examineSourceDownload failed', null)
        }
        shell.popd()
      })
    }
    if (job.trigger === 'rest') {
      // nothing to do here
      cb(null, job)
    }
  }

  function examineSourceDownloadCleanup (job, cb) {
    var workDirectory = tmpDir({prefix: 'drone-examineSource-'}, job.id)
    if (fs.existsSync(workDirectory)) {
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
      logger.debug('installIntoWorkflow failed!', err)
    })
}

function installIntoWorkflowCleanup (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    domain,
    examineSourceDownloadEvent + '.cleanup',
    900,
    function (err, res) {
      logger.debug('installIntoWorkflowCleanup failed!', err)
    })
}
