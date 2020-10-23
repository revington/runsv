[![Build Status](https://travis-ci.org/revington/runsv.svg?branch=master)](https://travis-ci.org/revington/runsv)
[![Known Vulnerabilities](https://snyk.io/test/github/revington/runsv/badge.svg?targetFile=package.json)](https://snyk.io/test/github/revington/runsv?targetFile=package.json)
[![Coverage Status](https://coveralls.io/repos/github/revington/runsv/badge.svg?branch=master)](https://coveralls.io/github/revington/runsv?branch=master)



## Usage

### Service definition

```javascript
// Redis service definition
const name = 'redis';
const redis = require('redis');

function create() {
    var client;

    function start(_, callback) {
        if (client) {
            throw new Error('already connected');
        }
        client = redis.createClient(REDIS);
        client.once('ready', callback);
    }

    function stop(callback) {
        client.quit(function (err) {
            client = null;
            return callback(err);
        });
    }

    function getClient() {
        return client;
    }
    return Object.freeze({
        name,
        start,
        stop,
        getClient
    });
}
```


### Service 

```javascript
const runsv = require('runsv').create();
// Require your defined services
const pg = require('./pg-service')();
const redis = require('./redis-service')();
// add them to runsv
runsv.addService(pg);
runsv.addService(redis);
// start your services and wait until ready
services.init(function (err) {
    // Ok, all services ready
    const {pg, redis} = services.getClients();
});
```

### Service with dependencies
```javascript
const runsv = require('runsv').create();
// Require your defined services
const a = require(...);
const b = require(...);
const c = require(...);
// service b depends on a
runsv.addService(b, a);
// service c depends on b
runsv.addService(c, b);

services.init(function (err) {
    // start order:
    // #1 a
    // #2 b
    // #3 c
});
```
