'use strict';
const {
    DepGraph
} = require('dependency-graph');
const EventEmitter = require('events');
const util = require('util');
const assert = require('assert');

function noop() {}

function isValidService(input) {
    assert(input.name, 'service must have a #name');
    const name = input.name;
    assert(input.start, `service ${name} must have a #start(getService, callback) function`);
    assert(input.stop, `service ${name} must have a #stop function`);
    assert.deepStrictEqual(typeof input.start, `function`, `${name} #start must be a function`);
    assert.deepStrictEqual(typeof input.stop, `function`, `${name} #stop must be a function`);
}

function SV() {
    this.services = {};
    this.dependencies = new DepGraph();
    EventEmitter.call(this);
}
util.inherits(SV, EventEmitter);
SV.prototype.addService = function addServiceImpl(service, ...dependencies) {
    var self = this;
    for (let s of [service, ...dependencies]) {
        isValidService(s);
        if (self.services[s.name]) {
            break;
        }
        self.services[s.name] = s;
        self.dependencies.addNode(s.name);
    }
    for (let dep of dependencies) {
        self.dependencies.addDependency(service.name, dep.name);
    }
};
SV.prototype.getService = function getService(name) {
    return this.services[name];
};
SV.prototype.init = function init(callback = noop) {
    var i = 0;
    const self = this;
    const plan = self.dependencies.overallOrder();

    function next(err) {
        const name = plan[i++];
        if (err) {
            return callback(err);
        }
        if (!name) {
            return callback();
        }
        const service = self.services[name];
        if (service.on) {
            // bubble up error events
            service.on('error', function (...args) {
                self.emit(ev, ...args, service.name);
            });
        }
        service.start(self.getService, next);
    }
    next();
}
SV.prototype.stop = function stop(callback = noop) {
    var i = 0;
    const self = this;
    const plan = self.dependencies.overallOrder().reverse(); // stop the services in reverse order

    function next(err) {
        var s = plan[i++];
        if (err) {
            return callback(err);
        }
        if (!s) {
            return callback();
        }
        self.services[s].stop(next);
    }
    next();
}

function create() {
    return new SV();
}
exports = module.exports = {
    create
}
