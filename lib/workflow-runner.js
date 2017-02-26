import path from 'path'
import Bluebird from 'bluebird'
import homedir from 'homedir'
import shell from 'shelljs'

export default class WorkflowRunner {
  constructor(project, job, workflow, options) {
    if (!project) throw new Error('Invalid project specified')
    if (!job) throw new Error('Invalid job specified')
    if (!workflow) throw new Error('Invalid workflow specified')

    options = options || {}

    const homeDir = homedir()

    this.project = project
    this.job = job
    this.workflow = workflow
    this.homeDir = homeDir
    this.results = []
    this.cloneDir = options.cloneDir || path.join(homeDir, '.drone-data')
    this.pluginDir = options.pluginDir || path.join(homeDir, '.drone-plugins')
  }

  /**
   * Start the execution of the workflow tasks.
   *
   */
  async start() {
    let startTask = this.getTask(this.workflow.startTaskId)

    if (!startTask) {
      throw new Error('Invalid workflow - missing start task')
    }

    await this.runTask(startTask)
    return this.finish()
  }

  /**
   * Run a given task
   */
  async runTask(task) {
    if (task.tasks) {
      // group of parallel tasks
      await this.runParallelTask(task)
      return Bluebird.resolve()
    } else {
      // single task
      try {
        let result = task.module ? await this.runPlugin(task.module, task.options) :
          await this.runCmd(task.cmd, task.options)

        this.results.push(result)

        if (task.successTaskId) {
          return await this.runTask(this.getTask(task.successTaskId))
        } else {
          return Bluebird.resolve()
        }
      } catch (error) {
        if (task.failureTaskId) {
          let failureResult = await this.runTask(this.getTask(task.failureTaskId))
          this.results.push(failureResult)
        } else {
          return Bluebird.reject(error)
        }
      }
    }
  }

  async runParallelTask(task) {
    let taskKeys = Object.keys(task.tasks)

    try {
      await Bluebird.all(taskKeys.map(key => this.runTask(task.tasks[key])))

      if (task.successTaskId) {
        return await this.runTask(this.getTask(task.successTaskId))
      } else {
        return Bluebird.resolve()
      }
    } catch (error) {
      if (task.failureTaskId) {
        let failureResult = await this.runTask(this.getTask(task.failureTaskId))
        this.results.push(failureResult)
      } else {
        return Bluebird.reject(error)
      }
    }
  }

  getTask(id) {
    return this.workflow.tasks[id]
  }

  /**
   * Fetch plugin and run with options and context data
   */
  async runPlugin(name, options) {
    let plugin = await this.getPlugin(name)

    if (plugin && !plugin.then) {
      try {
        let result = plugin(this.project, this.job, options)
        return Bluebird.resolve(result)
      } catch (error) {
        return Bluebird.reject(error)
      }
    } else if (plugin && plugin.then) {
      return plugin;
    } else {
      return Bluebird.reject(`invalid plugin: ${name}`)
    }
  }

  async getPlugin(name) {
    let plugin

    try {
      let pluginPath = path.join(this.pluginDir, name)
      plugin = require(pluginPath)
    } catch(e) {
      try {
        plugin = require(name)
      } catch (e2) {
        await this.runCmd(`npm install ${name}`)
        plugin = require(name)
      }
    }

    return plugin
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
    return new Bluebird((resolve, reject) => {
      var run = require('../../docker-shell')

      run(cmd, (err, kill, container) => {
        debugger;
        if (err) return reject(err)
        console.log('has container?')
        console.log(container)
        this.containerDocker = container
        this.killDocker = kill
        resolve()
      }, this.containerDocker)
    });
  }

  async finish(task) {
    this.killDocker()
    return Bluebird.resolve(this.results)
  }
}
