# drone

[![Greenkeeper badge](https://badges.greenkeeper.io/Strider-CD/drone.svg)](https://greenkeeper.io/)

The part that completes the core

[![Build Status](https://travis-ci.org/Strider-CD/drone.svg)](https://travis-ci.org/Strider-CD/drone)  
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Getting Started

Make sure the core is running, and you have it's accessable url.

```sh
npm install
DRONE_TOKEN=<token after drone create> CORE_URL=http://localhost:8000 npm start
```

You should see 'ping' on the drone, and 'pong' on core.
