'use strict'

require('babel-register')()

var path = require('path')
var tape = require('tape')
var Runner = require('../lib/workflow-runner').default

tape('runner', function (t) {
  t.plan(1)

  var runner = new Runner({ id: 'test-project' }, {}, {
    startTaskId: 'clone',
    tasks: {
      clone: {
        cmd: 'git clone --progress git@github.com:Strider-CD/dirkeeper.git',
        successTaskId: 'install',
        failureTaskId: 'cleanup'
      },

      install: {
        cmd: 'cd dirkeeper && npm install',
        successTaskId: 'test',
        failureTaskId: 'cleanup'
      },

      test: {
        module: 'test',
        options: {},
        successTaskId: 'deploy',
        failureTaskId: 'cleanup'
      },

      deploy: {
        cmd: 'echo "deploying.."'
      },

      cleanup: {
        cmd: 'rm -rf *'
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

tape.skip('runner - parallel', function (t) {
  t.plan(1)

  var runner = new Runner({}, {}, {
    startTaskId: 'test',
    tasks: {
      test: {
        tasks: {
          main: {
            module: 'test',
            options: {}
          },
          secondary: {
            cmd: 'npm info dirkeeper'
          }
        },
        successTaskId: 'deploy',
        failureTaskId: 'cleanup'
      },

      deploy: {
        cmd: 'echo "deploying.."'
      },

      cleanup: {
        cmd: 'ls'
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
