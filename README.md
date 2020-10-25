[![Build Status](https://travis-ci.org/revington/runsv.svg?branch=master)](https://travis-ci.org/revington/runsv)
[![Known Vulnerabilities](https://snyk.io/test/github/revington/runsv/badge.svg?targetFile=package.json)](https://snyk.io/test/github/revington/runsv?targetFile=package.json)
[![Coverage Status](https://coveralls.io/repos/github/revington/runsv/badge.svg?branch=master)](https://coveralls.io/github/revington/runsv?branch=master)

# A Node.js service manager

>Define and orchestrate your application services
Most applications rely in one or more databases, workers, APIs, etc. You want to start your application once those services are available. Also, you want to disconnect to them in reverse order. This module prodvides that functionality.
Lets see an example:  

Your express application is connected to Redis and PostgreSQL. You want to start your application *after* those connections are ready. When your application receives the `SIGTERM` signal you want to:

1. Stop accepting new connections and requests
2. Wait until current requests finish
3. Close any HTTP connections
4. Disconnect from Redis and PostgreSQL
5. Exit process

With `runsv` that strategy could be defined as:

```javascript
const http = require('http');
const runsv = require('runsv').create();
const req = http.IncomingMessage.prototype;
// Require your defined services
const pg = require('./lib/pg-service');
const redis = require('./lib/redis-service');
const app = require('./app');
// add them to runsv
runsv.addService(pg);
runsv.addService(redis);
runsv.addService(app, pg, redis); // app requires pg and redis
// start your services and wait until ready
runsv.init(function (err) {
    if(err){
        // deal with it...
    }
    process.once('SIGTERM', function(){
        runsv.stop();
    });
});
```

`runsv` will create a dependency graph and start them in the correct order. Services will stop in reverse order.  
Services with dependencies on another services will have access to them at `start` time. See services definition below.

## Service definition

A service is just and object with:  

* `name` Service name. A string.
* `start (dependencies, callback)` Start function.
* `stop (callback)` Stop function.
* [OPTIONAL] `getClient()` Return a client if the service exposes one i.e a database client.


```javascript
// Redis service definition
const name = 'redis';
const redis = require('redis');

function create() {
    var client;

    function start(dependencies, callback) {
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

See more service examples:

* [CouchDB](/examples/couchdb-service.js)
* [PostgreSQL](/examples/pg-service.js)
* [Redis](/examples/redis-service.js)
* [ElasticSearch](/examples/es-service.js)


## API

* `getService(name)` Get a service by its name.
* `addService(service, [...dependencies])` Adds a service with optional dependencies.
* `listServices()` Gets a list of services i.e `['pg', 'redis']`.
* `getClients(...only)` Get a bunch of clients, If no client is specified it returns all clients.
* `init(callback)` Start all services.
* `stop(callback)` Stop all services.
