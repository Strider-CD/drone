'use strict'

var Hapi = require('hapi')
var Primus = require('primus')
var config = require('config')
var server = new Hapi.Server()

server.connection({
  port: config.port
})

var primus = new Primus(server.listener)
var client = primus.Socket(config.coreUrl)

client.on('data', function (data) {
  console.log(data)
  client.write('pong')
})

if (!module.parent) {
  server.start(function (err) {
    if (err) {
      return console.error(err)
    }

    console.log('Server started', server.info.uri)
  })
}

module.exports = server
