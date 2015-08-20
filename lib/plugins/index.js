module.exports = function (emitter) {
  var examineSourceDownload = require('./examineSourceDownload.js')
  var examineSourceTravis = require('./examineSourceTravis.js')
  examineSourceDownload(emitter)
  examineSourceTravis(emitter)
}
