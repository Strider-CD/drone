export default class WorkflowRunner {
  constructor(project, workflow) {
    if (!project) {
      throw new Error('Invalid project specified')
    }

    this.project = project
    this.workflow = workflow
  }

  async start() {
    // TODO: start the workflow
    let startTaskId = this.workflow.startTaskId
    let startTask = this.workflow.tasks[startTaskId]

    if (!startTask) {
      throw new Error('Invalid workflow - missing start task')
    }

    await this.runTask(startTask)
  }

  /**
   * Run a given task
   */
  async runTask(task) {
    // Run a given task in the flow
    if (Array.isArray(task)) {
      // group of parallel tasks
    } else {
      if (task.module) {
        await this.runPlugin(task.module, task.options)
      } else if (task.cmd) {
        await this.runCmd(task.cmd, task.options)
      }
    }
  }

  /**
   * Fetch plugin and run with options and context data
   */
  async runPlugin(name, options) {
    var plugin = require(name)
    await plugin(options, this.project, this.job)
  }

  /**
   * `cmd` - The actual command to run
   * `options` - Options for the command above.
   *  - `screen` - The public command with private data masked
   *  - `env` - The environment vars, PATH etc..
   */
  async runCmd(cmd, options) {
    console.log('running cmd')
  }
}
