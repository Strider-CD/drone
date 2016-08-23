module.exports = function (emitter, client) {
  var examineSourceDownload = require('./examineSourceDownload.js');
  var examineSourceStrider = require('./examineSourceStrider.js');
  var localRunner = require('./localRunner.js');
  var cmdFilter = require('./cmdFilter.js');

  examineSourceDownload(emitter, client);
  examineSourceStrider(emitter, client);
  localRunner(emitter, client);
  cmdFilter(emitter, client);
};
//# sourceMappingURL=index.js.map