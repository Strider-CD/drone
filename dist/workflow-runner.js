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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

let WorkflowRunner = class WorkflowRunner {
  constructor(project, workflow, options) {
    if (!project) {
      throw new Error('Invalid project specified');
    }

    options = options || {};

    this.project = project;
    this.workflow = workflow;
    this.results = [];
    this.pluginDir = options.pluginDir || _path2.default.join((0, _homedir2.default)(), '.drone-plugins');
  }

  start() {
    var _this = this;

    return _asyncToGenerator(function* () {
      // TODO: start the workflow
      let startTask = _this.getTask(_this.workflow.startTaskId);

      if (!startTask) {
        throw new Error('Invalid workflow - missing start task');
      }

      yield _this.runTask(startTask);
      return yield _this.finish();
    })();
  }

  /**
   * Run a given task
   */
  runTask(task) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      // Run a given task in the flow
      if (task.tasks) {
        // group of parallel tasks
        let taskKeys = Object.keys(task.tasks);
        return yield _bluebird2.default.all(taskKeys.map(function (key) {
          return _this2.runTask(task.tasks[key]);
        }));
      } else {
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
            return _bluebird2.default.resolve();
          }
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
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let plugin = _this3.getPlugin(name);

      if (plugin) {
        return _bluebird2.default.resolve(plugin(options, _this3.project, _this3.job));
      } else {
        return _bluebird2.default.reject(`invalid plugin: ${ name }`);
      }
    })();
  }

  getPlugin(name) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      let plugin;

      try {
        let pluginPath = _path2.default.join(_this4.pluginDir, name);
        console.log(pluginPath);
        plugin = require(pluginPath);
      } catch (e) {
        try {
          plugin = require(name);
        } catch (e2) {
          yield _this4.runCmd(`npm install ${ name }`);
          plugin = require(name);
        }
      }

      return plugin;
    })();
  }

  /**
   * `cmd` - The actual command to run
   * `options` - Options for the command above.
   *  - `screen` - The public command with private data masked
   *  - `env` - The environment vars, PATH etc..
   */
  runCmd(cmd, options) {
    console.log(`running cmd:${ cmd }`);
    return _bluebird2.default.resolve(`cmd:${ cmd }`);
  }

  finish(task) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      return _bluebird2.default.resolve(_this5.results);
    })();
  }
};
exports.default = WorkflowRunner;
//# sourceMappingURL=workflow-runner.js.map