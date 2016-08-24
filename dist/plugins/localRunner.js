'use strict';

var async = require('async');
var StreamSplitter = require('stream-splitter');
var Wreck = require('wreck');
var shell = require('shelljs');
var config = require('config');
var exec = require('child_process').exec;
var logger = require('../util/log.js')(module);

var wreck = Wreck.defaults({
  json: true
});

var token = config.droneToken;

module.exports = function (emitter, client) {
  installIntoWorkflow(emitter);
  emitter.on('workflow.registeredEvent.runner.local', localRunner);

  var lineNumber = 1;
  var stdout = {};
  var stderr = {};

  function localRunner(job, cb) {
    lineNumber = 1;
    stdout = {};
    stderr = {};
    workDirectory = null;

    if (!job.triggerInfo.hasOwnProperty('cmds')) {
      cb(null, job); // nothing to do here
      return;
    }
    var execEnv = '';
    if (job.triggerInfo.hasOwnProperty('cmdsEnv')) {
      var envArray = job.triggerInfo.cmdsEnv.split(' ');
      var entry = null;
      envArray.forEach(function (elem, index, array) {
        entry = elem.split('=');
        if (entry.length === 2) {
          process.env[entry[0]] = entry[1];
        }
      });
    }
    var workDirectory = tmpDir({ prefix: 'drone-build-' }, job.id);
    shell.mkdir('-p', workDirectory);

    var cloneUrl = 'https://github.com/' + job.triggerInfo.data.branchBase;
    var cloneCmd = 'git clone --depth 50 ' + cloneUrl + ' .'; // shallow clone (truncate history)

    var fetchCmd = 'git fetch origin +' + job.triggerInfo.data.fetch + ':';
    var fetchHeadCmd = 'git checkout -qf FETCH_HEAD';

    var cmds = [cloneCmd, fetchCmd, fetchHeadCmd].concat(job.triggerInfo.cmds);
    var cmdList = cmds.join(' && ');
    cmds = [execEnv + ' /bin/bash -c ' + "'" + cmdList + "'"];
    cmds = cmds.map(function (cmd) {
      return function (callback) {
        runCmd(cmd, job, workDirectory, callback);
      };
    });
    logger.info('job.id ' + job.id + ' will run cmds');
    async.series(cmds, function (err, res) {
      if (err) {
        if (err.hasOwnProperty('canceled')) {
          job.status = 'aborted';
          job.result = 'failed';
        } else if (err.hasOwnProperty('failed')) {
          job.status = 'finished';
          job.result = 'failed';
        }
      } else {
        job.status = 'finished';
        job.result = 'success';
      }
      job.stdout = stdout;
      job.stderr = stderr;
      logger.info('job.id ' + job.id + ' finished with status: ' + job.result);
      // client.write({room: job.id, 'msg': { type: 'control', save: true, 'returnCode': returnCode }})
      client.write({ room: job.id, type: 'leave', msg: {} });
      shell.rm('-rf', workDirectory);
      wreck.put(config.coreUrl + '/api/v1/jobs/id/' + job.id, {
        payload: JSON.stringify(job),
        'headers': { 'authorization': token }
      }, function (err, res, payload) {
        if (res.statusCode !== 200) {
          logger.warn('failed to upload updated job to core');
        }
        if (err) {
          logger.warn('failed to upload updated job to core', err);
          return;
        }
        cb(null, job);
      });
    });
  }

  function runCmd(cmd, job, workDirectory, callback) {
    client.write({ room: job.id, type: 'join', msg: {} });
    var child = exec(cmd, { cwd: workDirectory, maxBuffer: 500 * 1024 });

    var splitStreamStdout = child.stdout.pipe(StreamSplitter('\n'));
    var splitStreamStderr = child.stderr.pipe(StreamSplitter('\n'));

    splitStreamStdout.on('token', function (lineStream) {
      var line = lineStream.toString();
      logger.info(line);
      stdout[lineNumber] = line;
      client.write({
        'room': job.id,
        'type': 'stdout',
        'msg': {
          'line': line,
          'lineNumber': lineNumber
        }
      });
      lineNumber++;
    });

    splitStreamStderr.on('token', function (lineStream) {
      var line = lineStream.toString();
      logger.info(line);
      stderr[lineNumber] = line;
      client.write({
        'room': job.id,
        'type': 'stderr',
        'msg': {
          'line': line,
          'lineNumber': lineNumber
        }
      });
      lineNumber++;
    });

    child.on('exit', function (returnCode) {
      if (!returnCode) {
        callback(null, null); // zero return value -> success
      } else {
        callback({ failed: true }, null); // non-zero return value -> cmd failed
      }
    });
  }
};

function installIntoWorkflow(emitter) {
  emitter.emit('workflow.registeredEvent.install', 'job.new', 'workflow.registeredEvent.runner.local', 400, function (err, res) {
    logger.debug('installIntoWorkflow failed', err);
  });
  emitter.on('auth.token', function (newToken) {
    token = newToken;
  });
}

function tmpDir(config, name) {
  var dirName = '';
  if (config.hasOwnProperty('baseDir')) {
    dirName = config.baseDir;
  } else {
    dirName = '/tmp';
  }
  if (config.hasOwnProperty('prefix')) {
    dirName = '/tmp/' + config.prefix + name;
  } else {
    dirName = '/tmp/' + name;
  }
  return dirName;
}
//# sourceMappingURL=localRunner.js.map