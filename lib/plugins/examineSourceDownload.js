var tmp = require('tmp')
var yaml = require('js-yaml')
var fs = require('fs')
require('shelljs/global')

var examineSourceDownloadEvent = 'workspace.registeredEvent.examineSource.download'
var domain = 'job.new'
var examineSourceDomain = 'examineSource.downloaded'

module.exports = function (emitter) {
  installIntoWorkflow(emitter)
  emitter.on(examineSourceDownloadEvent, examineSourceDownload)

  function examineSourceDownload (job, queue, cb) {
    if (job.trigger === 'github') {
      var workDirEnv = env['DRONE_WORK_DIR']
      var workDirectory
      if (workDirEnv) workDirectory = tmp.dirSync({dir: workDirEnv, prefix: 'drone-examineSource-', unsafeCleanup: true})
      else workDirectory = tmp.dirSync({prefix: 'drone-examineSource-', unsafeCleanup: true})
      tmp.setGracefulCleanup()

      //var workDirectory = {name: '/tmp/drone-examineSource-8274v6rRUd581qFO'}
      pushd(workDirectory.name)
      var cloneUrl = 'https://github.com/' + job.triggerInfo.data.user + '/' + job.triggerInfo.data.repo
      var cloneCmd = 'git clone --depth 1 ' + cloneUrl + ' .' // shallow clone (truncate history)
      //var cloneCmd = 'touch tmpfile.txt'

      exec(cloneCmd, function (code, output) {
        console.log('executed')
        if (code === 0) {
          console.log('return positve')
          emitter.emit('workflow.registeredEvent.start', examineSourceDomain, job, function (err, res) {
            console.log('downloaded')
            popd()
            exec('rm -rf ' + workDirectory.name, function (code, output) {
              console.log('rm -rf ' + workDirectory.name, code)
              console.log('rm -rf ' + workDirectory.name, output)
              cb(null, null)
            })
            //rm('-rf', workDirectory.name)

          })
        } else {
          console.log('download failed')
          popd()
          rm('-rf', workDirectory.name)
          cb(null, null)
        }
      })
    }
    if (job.trigger === 'rest') {
      // nothing to do here
      console.log('received rest job')
      console.log('job id: ', job.id)
      console.log('job.triggerInfo.cmdsEnv: ', job.triggerInfo.cmdsEnv)
      console.log('job parrent: ', job.parrent)
      cb(null, null)
    }
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
