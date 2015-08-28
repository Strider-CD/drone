var tmp = require('tmp')
var lodash = require('lodash')
var async = require('async')
var StreamSplitter = require('stream-splitter')
var Wreck = require('wreck')
var yaml = require('js-yaml')
var fs = require('fs')
var logger = require('../util/log.js')(module)
require('shelljs/global')

var wreck = Wreck.defaults({
  json: true
})

module.exports = function (emitter, client) {
  installIntoWorkflow(emitter)
  emitter.on('workflow.registeredEvent.cmd.filter', cmdFilter)

  function cmdFilter (job, cb) {
    if (!job.triggerInfo.hasOwnProperty('cmds')) {
      cb(null, job) // nothing to do here
      return
    }

    if (job.triggerInfo.hasOwnProperty('cmds')) {
      // TODO: patterns should reside in a config file
      var pattern = /\bsudo\b/
      job.triggerInfo.cmds = job.triggerInfo.cmds.filter(function (elem) {
        if (pattern.exec(elem) === null)
        {
          return true
        } else {
          return false
        }// discard command if one of the regexps matches
      })
    }
    cb(null, job)
  }
}

function installIntoWorkflow (emitter) {
  emitter.emit('workflow.registeredEvent.install',
    'job.new',
    'workflow.registeredEvent.cmd.filter',
    300,
    function (err, res) {})
}
