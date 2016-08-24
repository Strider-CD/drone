'use strict';

// returns the name (a string) for a temporary dir
function tmpDir(config, name) {
  var dirName = '';
  if (config.hasOwnProperty('baseDir')) {
    dirName = config.baseDir;
  } else {
    dirName = '/tmp';
  }
  if (config.hasOwnProperty('prefix')) {
    dirName = dirName + '/' + config.prefix + name;
  } else {
    dirName = dirName + '/' + name;
  }
  return dirName;
}

module.exports = tmpDir;
//# sourceMappingURL=tmpDir.js.map