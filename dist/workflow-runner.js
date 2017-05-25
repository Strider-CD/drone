'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _homedir = require('homedir');

var _homedir2 = _interopRequireDefault(_homedir);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

let WorkflowRunner = class WorkflowRunner {
  constructor(project, job, workflow, options) {
    if (!project) throw new Error('Invalid project specified');
    if (!job) throw new Error('Invalid job specified');
    if (!workflow) throw new Error('Invalid workflow specified');

    options = options || {};

    const homeDir = (0, _homedir2.default)();

    this.project = project;
    this.job = job;
    this.workflow = workflow;
    this.homeDir = homeDir;
    this.results = [];
    this.cloneDir = options.cloneDir || _path2.default.join(homeDir, '.drone-data');
    this.pluginDir = options.pluginDir || _path2.default.join(homeDir, '.drone-plugins');
  }

  /**
   * Start the execution of the workflow tasks.
   *
   */
  start() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let startTask = _this.getTask(_this.workflow.startTaskId);

      if (!startTask) {
        throw new Error('Invalid workflow - missing start task');
      }

      yield _this.runTask(startTask);
      return _this.finish();
    })();
  }

  /**
   * Run a given task
   */
  runTask(task) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (task.tasks) {
        // group of parallel tasks
        yield _this2.runParallelTask(task);
        return _bluebird2.default.resolve();
      } else {
        // single task
        try {
          let result = task.module ? yield _this2.runPlugin(task.module, task.options) : yield _this2.runCmd(task.cmd, task.options);

          _this2.results.push(result);

          if (task.successTaskId) {
            return yield _this2.runTask(_this2.getTask(task.successTaskId));
          } else {
            return _bluebird2.default.resolve();
          }
        } catch (error) {
          if (task.failureTaskId) {
            let failureResult = yield _this2.runTask(_this2.getTask(task.failureTaskId));
            _this2.results.push(failureResult);
          } else {
            return _bluebird2.default.reject(error);
          }
        }
      }
    })();
  }

  runParallelTask(task) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let taskKeys = Object.keys(task.tasks);

      try {
        yield _bluebird2.default.all(taskKeys.map(function (key) {
          return _this3.runTask(task.tasks[key]);
        }));

        if (task.successTaskId) {
          return yield _this3.runTask(_this3.getTask(task.successTaskId));
        } else {
          return _bluebird2.default.resolve();
        }
      } catch (error) {
        if (task.failureTaskId) {
          let failureResult = yield _this3.runTask(_this3.getTask(task.failureTaskId));
          _this3.results.push(failureResult);
        } else {
          return _bluebird2.default.reject(error);
        }
      }
    })();
  }

  getTask(id) {
    return this.workflow.tasks[id];
  }

  /**
   * Fetch plugin and run with options and context data
   */
  runPlugin(name, options) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      let plugin = yield _this4.getPlugin(name);

      if (plugin && !plugin.then) {
        try {
          let result = plugin(_this4.project, _this4.job, options);
          return _bluebird2.default.resolve(result);
        } catch (error) {
          return _bluebird2.default.reject(error);
        }
      } else if (plugin && plugin.then) {
        return plugin;
      } else {
        return _bluebird2.default.reject(`invalid plugin: ${ name }`);
      }
    })();
  }

  getPlugin(name) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let plugin;

      try {
        let pluginPath = _path2.default.join(_this5.pluginDir, name);
        plugin = require(pluginPath);
      } catch (e) {
        try {
          plugin = require(name);
        } catch (e2) {
          yield _this5.runCmd(`npm install ${ name }`);
          plugin = require(name);
        }
      }

      return plugin;
    })();
  }

  /**
   * `cmd` - The actual command to run
   * `options` - Options for the command above.
   *  - `cwd` - The directory that commands start in
   *  - `screen` - The public command with private data masked
   *  - `env` - The environment vars, PATH etc..
   */
  runCmd(cmd, options) {
    /*
      options = options || {}
       return new Bluebird((resolve, reject) => {
        try {
          console.log(`running cmd: ${cmd}`)
           let dir = options.cwd || path.join(this.cloneDir, this.project.id || 'test')
           // check if the cwd exists, if not make it
          if (!shell.test('-d', dir)) {
            shell.mkdir('-p', dir)
          }
           // Run all commands in cwd
          shell.pushd(dir)
        } catch (e) {
          return reject(e)
        }
         shell.exec(cmd, function (code, output) {
          shell.popd()
           if (code > 0) {
            return reject(output)
          }
           resolve(code)
        })
      })
      */
    var DockerShell = require('docker-shell').default;
    var dockerShell = new DockerShell();

    return dockerShell.run(cmd).then(({ kill }) => {
      console.log('has container?');
      console.log(container);
      this.killDocker = kill;
    }).catch(error => {
      console.log(error);
      throw error;
    });
  }

  finish(task) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      _this6.killDocker();
      return _bluebird2.default.resolve(_this6.results);
    })();
  }
};
exports.default = WorkflowRunner;
//# sourceMappingURL=workflow-runner.js.map