var Wreck = require('wreck')
var logger = require('../log.js')(module)
var config = require('config')

var jobRunnerStatus = 'done'
var wreck = Wreck.defaults({
  json: true
})

function getNewJob (emitter) {
  if (jobRunnerStatus == 'active') {
    return
  }
  logger.info('asking core for new job')
  Wreck.get(config.coreUrl + '/api/v1/jobs/retrieve', function (err, res, payload) {
    if (err) return
    if (res.headers['content-length'] == 0) return
    var job = JSON.parse(payload)
    jobRunnerStatus = 'active'
    logger.info('got new job', job)
    emitter.emit('workflow.baseEvents.job.new', job, function(err, res) {
      if(err) {
        logger.warn('something went wrong whilst processing: ', job)
        // TODO: notify core that this job failed (re-insert into queue?)
      }
      //jobRunnerStatus = 'done'
    })
  })
}

module.exports = function (emitter, pollingInterval) {
  installIntoWorkflow(emitter)
  emitter.on('workflow.registeredEvent.core.poller', function() {
    jobRunnerStatus = 'done'
  })
  var interval = setInterval(function () { getNewJob(emitter) }, pollingInterval)
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    'job.retrieve.new',
    'workflow.registeredEvent.core.poller',
    100,
    function (err, res) {
    })
}
