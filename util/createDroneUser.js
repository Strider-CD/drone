var Wreck = require('wreck')
var config = require('config')

var basicHeader = function (username, password) {
  return 'Basic ' + (new Buffer(username + ':' + password, 'utf8')).toString('base64')
}

var options = {
  headers: {
    authorization: basicHeader(config.get('core.adminUser'), config.get('core.adminPwd'))
  },
  timeout: 1000, // 1 second, default: unlimited
  maxBytes: 1048576 // 1 MB, default: unlimited
}

var adminToken = null

Wreck.request('GET', config.coreUrl + '/api/v1/users/login', options, function (err, res) {
  if (err) return console.error('Authentication error: ', err)
  if (res.statusCode !== 200) return console.error('Authentication error')
  if (!(res.headers.authorization)) return console.error('Authentication error')
  adminToken = res.headers.authorization

  var drone = {
    name: config.droneName
  }

  var options = {
    headers: {authorization: adminToken},
    payload: JSON.stringify(drone),
    timeout: 1000, // 1 second, default: unlimited
    maxBytes: 1048576 // 1 MB, default: unlimited
  }

  Wreck.request('POST', config.coreUrl + '/api/v1/drones', options, function (err, res) {
    if (err) return console.error('Create drone failed: ', err)
    if (res.statusCode !== 200) return console.error('Create drone failed status != 200')
    console.log('drone username / password should be registered')
    console.log('Your API key is:')
    console.log(res.headers.authorization)
    console.log('You may start the drone using the following command:')
    console.log('CORE_API_TOKEN=<fill in the token here> CORE_URL=<URL to core> DRONE_NAME=<some sensible name> npm start')
  })

})
