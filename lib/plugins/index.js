module.exports = function (emitter, client) {
  var examineSourceDownload = require('./examineSourceDownload.js')
  var examineSourceTravis = require('./examineSourceTravis.js')
  var localRunner = require('./localRunner.js')
  var cmdFilter = require('./cmdFilter.js')

  examineSourceDownload(emitter, client)
  examineSourceTravis(emitter, client)
  localRunner(emitter, client)
  cmdFilter(emitter, client)
}
