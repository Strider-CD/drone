var yaml = require('js-yaml')
var fs = require('fs')
var Wreck = require('wreck')
var config = require('config')
var logger = require('../util/log.js')(module)
var tmpDir = require('../util/tmpDir.js')

var wreck = Wreck.defaults({
  json: true
})

var token = config.coreAPIToken

module.exports = function (emitter) {
  installIntoWorkflow(emitter)
  emitter.on('workflow.registeredEvent.examineSource.download.travis', examineSourceTravis)

  function examineSourceTravis (job, cb) {
    var workDirectory = tmpDir({prefix: 'drone-examineSource-'}, job.id)

    if (job.trigger === 'github') {
      var doc = null
      if (fs.existsSync(workDirectory)) {
        try {
          doc = yaml.safeLoad(fs.readFileSync(workDirectory + '/.travis.yml', 'utf8'))
        } catch (e) {
          logger.warn('Failed to load .travis.yml!', e)
        }
      }
      if (!doc) {
        cb(null, job)
        return
      }

      if (doc.hasOwnProperty('env')) {
        if (doc.env.length > 1) {
          // Matrix build
          var childNo = 1
          doc.env.forEach(function (elem, index, array) {
            var childJob = clone(job)
            childJob._id = undefined
            childJob.parent = job.id
            childJob.childNo = childNo
            childJob.children = {}
            childJob.status = 'received'
            childJob.trigger = 'rest'
            childJob.stdout = {}
            childJob.stderr = {}
            childJob.triggerInfo.cmds = []
            if (doc.hasOwnProperty('before_install')) childJob.triggerInfo.cmds = childJob.triggerInfo.cmds.concat(doc.before_install)
            if (doc.hasOwnProperty('install')) childJob.triggerInfo.cmds = childJob.triggerInfo.cmds.concat(doc.install)
            if (doc.hasOwnProperty('script')) childJob.triggerInfo.cmds = childJob.triggerInfo.cmds.concat(doc.script)
            childJob.triggerInfo.cmdsEnv = elem + ' TRAVIS_PULL_REQUEST=' + job.triggerInfo.data.number
            delete childJob['meta']
            delete childJob['$loki']
            delete childJob['id']
            childNo++
            wreck.post(config.coreUrl + '/api/v1/jobs', {
              payload: JSON.stringify(childJob),
              'headers': {'authorization': token}
            }, function (err, res, payload) {
              if (err) logger.warn('failed to submit a child job', childJob)
            })
          })
        }
      }
    }
    if (job.trigger === 'rest') {
      // nothing to do here
    }
    cb(null, job)
  }
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    'job.new',
    'workflow.registeredEvent.examineSource.download.travis',
    110,
    function (err, res) {
      logger.debug('installIntoWorkflow failed', err)
    })
  emitter.on('auth.token', function (newToken) {
    token = newToken
  })
}

function clone (a) {
  return JSON.parse(JSON.stringify(a))
}
