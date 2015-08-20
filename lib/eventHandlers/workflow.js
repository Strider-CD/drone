var PriorityQueue = require('priorityqueuejs')

var registeredEvents = {
  'job.new': new PriorityQueue(queueCmpFunction),
  'job.stop': new PriorityQueue(queueCmpFunction),
  'job.retrieve.new': new PriorityQueue(queueCmpFunction)
}

module.exports = function (emitter) {
  emitter.on('workflow.baseEvents.job.new', baseEventsjobNew)
  emitter.on('workflow.baseEvents.job.new', baseEventsjobStop)
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

  function registeredEventInstall (step, registeredEvent, priority, cb) {
    if (!registeredEvents.hasOwnProperty(step)) {
      registeredEvents[step] = new PriorityQueue(queueCmpFunction)
    }
    registeredEvents[step].enq({
      'priority': priority,
      'registeredEvent': registeredEvent
    })
    cb(null, true)
  }

  function registeredEventNext (job, queue, cb) {
    if (queue.size() > 0) {
      var item = queue.deq()
      emitter.emit(item.registeredEvent, job, queue, cb)
    } else {
      cb(null, null)
    }
  }

  function registeredEventStart (domain, job, cb) {
    if (registeredEvents.hasOwnProperty(domain)) {
      queue = cloneQueue(registeredEvents[domain])
      registeredEventNext(job, queue, cb)
    } else {
      cb(null, null) // nothing registered
    }
  }

}

function queueCmpFunction (registeredEventA, registeredEventB) {
  return registeredEventA.priority - registeredEventB.priority
}

function cloneQueue (queue) {
  var newQueue = new PriorityQueue(queueCmpFunction)
  queue.forEach(function (element, index) {
    newQueue.enq(element)
  })
  return newQueue
}
