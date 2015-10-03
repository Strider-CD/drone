var Wreck = require('wreck')
var logger = require('../util/log.js')(module)
var config = require('config')

var jobRunnerStatus = 'done'
var wreck = Wreck.defaults({
  json: true
})

var token = config.coreAPIToken

function getNewJob (emitter) {
  if (jobRunnerStatus === 'active') {
    return
  }

  var options = {
      'headers': {'authorization': token},
      'timeout': 1000,    // 1 second, default: unlimited
      'maxBytes': 1048576 // 1 MB, default: unlimited
  }

  logger.info('asking core for new job')
  wreck.get(config.coreUrl + '/api/v1/jobs/retrieve', options, function (err, res, payload) {
    if (err) return
    if (res.statusCode !== 200) return
    if (res.headers['content-length'] === 0) return
    var job = payload
    jobRunnerStatus = 'active'
    logger.info('got new job', job)
    emitter.emit('workflow.baseEvents.job.new', job, function (err, res) {
      if (err) {
        logger.warn('something went wrong whilst processing: ', job)
        // TODO: notify core that this job failed (re-insert into queue?)
      }
    })
  })
}

module.exports = function (emitter, pollingInterval) {
  installIntoWorkflow(emitter)
  emitter.on('workflow.registeredEvent.core.poller', function (job, cb) {
    jobRunnerStatus = 'done'
    cb(null, job)
  })
  emitter.on('auth.token', function (newToken) {
    token = newToken
  })
  setInterval(function () { getNewJob(emitter) }, pollingInterval)
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    'job.new',
    'workflow.registeredEvent.core.poller',
    1000,
    function (err, res) {
      logger.debug('installIntoWorkflow failed!', err)
    })
}
