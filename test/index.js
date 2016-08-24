'use strict'

require('babel-register')()

var path = require('path')
var tape = require('tape')
var Runner = require('../lib/workflow-runner').default

tape('placeholder - add meaningful tests', function (t) {
  t.ok(parseFloat('1') === 1, 'No meaningful tests present... Please add some')
  t.end()
})

tape('runner', function (t) {
  t.plan(1)

  var runner = new Runner({}, {
    startTaskId: 'test',
    tasks: {
      test: {
        module: 'test',
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
  }, { pluginDir: path.join(__dirname, 'plugins') })

  runner.start()
    .then(results => {
      console.log(results)
      t.equal(results.length, 2, 'Ran right number of tasks')
    })
    .catch(err => {
      t.error(err)
    })
})

tape('runner - parallel', function (t) {
  t.plan(1)

  var runner = new Runner({}, {
    startTaskId: 'test',
    tasks: {
      test: {
        tasks: {
          main: {
            module: 'test',
            options: {}
          },
          secondary: {
            cmd: 'npm test'
          }
        },
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
  }, { pluginDir: path.join(__dirname, 'plugins') })

  runner.start()
    .then(results => {
      console.log(results)
      t.equal(results.length, 3, 'Ran right number of tasks')
    })
    .catch(err => {
      t.error(err)
    })
})
