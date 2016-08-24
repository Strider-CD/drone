import path from 'path'
import Bluebird from 'bluebird'
import homedir from 'homedir'

export default class WorkflowRunner {
  constructor(project, workflow, options) {
    if (!project) {
      throw new Error('Invalid project specified')
    }

    options = options || {}

    this.project = project
    this.workflow = workflow
    this.results = []
    this.pluginDir = options.pluginDir || path.join(homedir(), '.drone-plugins')
  }

  async start() {
    // TODO: start the workflow
    let startTask = this.getTask(this.workflow.startTaskId)

    if (!startTask) {
      throw new Error('Invalid workflow - missing start task')
    }

    await this.runTask(startTask)
    return await this.finish()
  }

  /**
   * Run a given task
   */
  async runTask(task) {
    // Run a given task in the flow
    if (Array.isArray(task)) {
      // group of parallel tasks
      return await Bluebird.all(task.map(task => this.runTask(task)))
    } else {
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
          return Bluebird.resolve()
        }
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
    let plugin;

    try {
      let pluginPath = path.join(this.pluginDir, name)
      console.log(pluginPath)
      plugin = require(pluginPath)
    } catch(e) {
      console.log(e)
      try {
        plugin = require(name)
      } catch (e2) {
        console.log(e2)
        await this.runCmd(`npm install ${name}`)
        plugin = require(name)
      }
    }

    if (plugin) {
      return Bluebird.resolve(plugin(options, this.project, this.job))
    } else {
      return Bluebird.reject(`invalid plugin: ${name}`)
    }
  }

  /**
   * `cmd` - The actual command to run
   * `options` - Options for the command above.
   *  - `screen` - The public command with private data masked
   *  - `env` - The environment vars, PATH etc..
   */
  runCmd(cmd, options) {
    console.log(`running cmd: ${cmd}`)
    return Bluebird.resolve(cmd)
  }

  async finish(task) {
    return Bluebird.resolve(this.results)
  }
}