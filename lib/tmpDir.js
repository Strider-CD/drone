// returns the name (a string) for a temporary dir
function tmpDir (config, name) {
  var dirName = ''
  if (config.hasOwnProperty('baseDir')) {
    dirName = config.baseDir
  } else {
    dirName = '/tmp'
  }
  if (config.hasOwnProperty('prefix')) {
    dirName = '/tmp/' + config.prefix + name
  } else {
    dirName = '/tmp/' + name
  }
  return dirName
}

module.exports = tmpDir
