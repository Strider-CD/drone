function installEvent (emitter, domain, event, priority) {
  emitter.emit('workspace.registeredEvent.install',
    'examineSource.downloaded',
    'workspace.registeredEvent.examineSource.downloaded.travis',
    100,
    function (err, res) {
      console.log(err, res)
    })
}
