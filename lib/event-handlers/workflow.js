const lodash = require('lodash')
const async = require('async')
const logger = require('../util/log')(module)

var registeredEvents = {
  'job.new': [],
  'job.stop': [],
  'job.retrieve.new': []
}

module.exports = function (emitter) {
  emitter.on('workflow.baseEvents.job.new', baseEventsjobNew)
  emitter.on('workflow.baseEvents.job.stop', baseEventsjobStop)
  emitter.on('workflow.baseEvents.job.retrieve.new', baseEventsjobRetrieveNew)
  emitter.on('workflow.registeredEvent.install', registeredEventInstall)
  emitter.on('workflow.registeredEvent.next', registeredEventInstall)
  emitter.on('workflow.registeredEvent.start', registeredEventStart)

  function baseEventsjobNew (job, cb) {
    registeredEventStart('job.new', job, cb)
  }

  function baseEventsjobStop (job, cb) {
    registeredEventStart('job.stop', job, cb)
  }

  function baseEventsjobRetrieveNew (job, cb) {
    registeredEventStart('job.retrieve.new', cb)
  }

  function registeredEventInstall ({domain, registeredEvent, priority}, cb) {
    if (!registeredEvents.hasOwnProperty(domain)) {
      registeredEvents[domain] = []
    }
    if (registeredEvents[domain].length === 0) {
      var startJob = {
        priority: 1
      }
      registeredEvents[domain].push(startJob)
    }
    registeredEvents[domain].push({
      priority,
      registeredEvent
    })
    registeredEvents[domain] = lodash.sortBy(registeredEvents[domain], eventSort)

    cb(null, true)
  }

  function registeredEventStart (domain, job, cb) {
    if (registeredEvents.hasOwnProperty(domain)) {
      registeredEvents[domain] = lodash.sortBy(registeredEvents[domain], eventSort)
      async.waterfall(registeredEvents[domain].map(function (item) {
        if (item.priority === 1) {
          return function (callback) {
            callback(null, job)
          }
        } else {
          return function (job, callback) {
            emitter.emit(item.registeredEvent, job, callback)
          }
        }
      }), function (err, result) {
        if (err) {
          logger.warn(err, result)
        }
      })
    } else {
      cb(null, null) // nothing registered
    }
  }
}

function eventSort (registeredEvent) {
  return registeredEvent.priority
}
