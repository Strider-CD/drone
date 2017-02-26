module.exports = function (emitter, client) {
  var examineSourceDownload = require('./examineSourceDownload')
  var examineSourceStrider = require('./examineSourceStrider')
  var localRunner = require('./localRunner')
  var cmdFilter = require('./cmdFilter')

  examineSourceDownload(emitter, client)
  examineSourceStrider(emitter, client)
  localRunner(emitter, client)
  cmdFilter(emitter, client)
}
