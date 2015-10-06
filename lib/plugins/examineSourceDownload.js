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

      var cloneUrl = 'https://github.com/' + job.triggerInfo.data.branchBase
      var cloneCmd = 'git clone --depth 50 ' + cloneUrl + ' .' // shallow clone (truncate history)
      var fetchCmd = 'git fetch origin +' + job.triggerInfo.data.fetch + ':'
      var fetchHeadCmd = 'git checkout -qf FETCH_HEAD'

      var cloneCmds = [cloneCmd, fetchCmd, fetchHeadCmd]
      var cmds = cloneCmds.join('; ')

      shell.pushd(workDirectory)
      shell.exec(cmds, function (code, output) {
        if (code === 0) {
          shell.popd()
          cb(null, job)
        } else {
          logger.warn('download failed', output)
          shell.popd()
          cb(null, job)
        }
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
