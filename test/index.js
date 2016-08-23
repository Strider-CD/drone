'use strict'

require('babel-register')()

var tape = require('tape')
var Runner = require('../lib/workflow-runner').default

tape('placeholder - add meaningful tests', function (t) {
  t.ok(parseFloat('1') === 1, 'No meaningful tests present... Please add some')
  t.end()
})

tape('runner', function (t) {
  var runner = new Runner({}, {
    startTaskId: 'test',
    tasks: {
      test: {
        module: './test',
        options: {},
        successTaskId: 'deploy',
        failureTaskId: 'cleanup'
      },

      deploy: {
        cmd: 'sudo service test'
      },

      cleanup: {
        cmd: 'rm -rf /var/www/myproject'
      }
    }
  })

  runner.start()
  t.end()
})
