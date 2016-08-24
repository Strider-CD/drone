var Bluebird = require('bluebird')
module.exports = function () {
  console.log('running test...')
  return Bluebird.resolve(true)
}
