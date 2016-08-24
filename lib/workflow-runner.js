import path from 'path'
import Bluebird from 'bluebird'
import homedir from 'homedir'

export default class WorkflowRunner {
  constructor(project, job, workflow, options) {
    if (!project) throw new Error('Invalid project specified')
    if (!job) throw new Error('Invalid job specified')
    if (!workflow) throw new Error('Invalid workflow specified')

    options = options || {}

    this.project = project
    this.job = job
    this.workflow = workflow
    this.results = []
    this.pluginDir = options.pluginDir || path.join(homedir(), '.drone-plugins')
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
   *  - `screen` - The public command with private data masked
   *  - `env` - The environment vars, PATH etc..
   */
  runCmd(cmd, options) {
    console.log(`running cmd:${cmd}`)
    return Bluebird.resolve(`cmd:${cmd}`)
  }

  async finish(task) {
    return Bluebird.resolve(this.results)
  }
}
