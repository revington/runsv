'use strict';
const {
	DepGraph
} = require('dependency-graph');
const EventEmitter = require('events');
const util = require('util');
const assert = require('assert');

function isValidService (input) {
	assert(input.name, 'service must have a #name');
	const name = input.name;
	assert(input.start, `service ${name} must have a #start(getService, callback) function`);
	assert(input.stop, `service ${name} must have a #stop function`);
	assert.deepStrictEqual(typeof input.start, 'function', `${name} #start must be a function`);
	assert.deepStrictEqual(typeof input.stop, 'function', `${name} #stop must be a function`);
}

function RunSV () {
	this.services = new Map();
	this.dependencies = new DepGraph();
	EventEmitter.call(this);
}
util.inherits(RunSV, EventEmitter);
RunSV.prototype.addService = function addServiceImpl (service, ...dependencies) {
	var self = this;
	for (const s of [service, ...dependencies]) {
		isValidService(s);
		if (self.services.has(s.name)) {
			break;
		}
		self.services.set(s.name, s);
		self.dependencies.addNode(s.name);
	}
	for (const dep of dependencies) {
		self.dependencies.addDependency(service.name, dep.name);
	}
};
RunSV.prototype.getService = function getService (name) {
	assert(!!name, 'service name is required');
	return this.services.get(name);
};
RunSV.prototype.listServices = function listServices () {
	return Array.from(this.services.keys());
};
RunSV.prototype.getClients = function getClients (...only) {
	const ret = {};
	const names = (only.length && only) || Array.from(this.services.keys());
	// populate the result with existing clients
	for (const n of names) {
		const service = this.services.get(n);
		if (service.getClient) {
			ret[n] = service.getClient();
		}
	}
	return ret;
};
RunSV.prototype.init = function init (callback) {
	var i = 0;
	const self = this;
	assert(callback, 'callback is required');
	let plan;
	try {
		plan = self.dependencies.overallOrder();
	} catch (e) {
		// typically a circular dependency
		return callback(e);
	}

	function next (err) {
		if (err) {
			return callback(err);
		}
		const name = plan[i++];
		if (!name) {
			return callback();
		}
		const service = self.services.get(name);
		const dependencies = self.dependencies.dependenciesOf(name);
		if (dependencies.length) {
			service.start(self.getClients(...dependencies), next);
		} else {
			service.start(null, next);
		}
	}
	next();
};
RunSV.prototype.stop = function stop (callback) {
	var i = 0;
	const self = this;
	assert(callback, 'callback is required');
	const plan = self.dependencies.overallOrder().reverse(); // stop the services in reverse order

	function next (err) {
		var s = plan[i++];
		if (err) {
			return callback(err);
		}
		if (!s) {
			return callback();
		}
		self.services.get(s).stop(next);
	}
	next();
};

function create () {
	return new RunSV();
}
exports = module.exports = {
	create
};
