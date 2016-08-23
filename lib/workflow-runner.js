import Bluebird from 'bluebird'

export default class WorkflowRunner {
  constructor(project, workflow) {
    if (!project) {
      throw new Error('Invalid project specified')
    }

    this.project = project
    this.workflow = workflow
    this.results = []
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
  runPlugin(name, options) {
    return Bluebird.resolve(name)
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
