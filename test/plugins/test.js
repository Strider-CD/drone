var Bluebird = require('bluebird')

module.exports = function () {
  console.log('running plugin:test...')
  return Bluebird.resolve('plugin:test')
}
