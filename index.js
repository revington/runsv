'use strict';
const {
	DepGraph
} = require('dependency-graph');
const EventEmitter = require('events');
const util = require('util');
const assert = require('assert');
const {isAsync} = require('./lib/util');


function isValidService (input) {
	assert(input.name, 'service must have a #name');
	const name = input.name;
	assert(input.start, `service ${name} must have a #start(dependencies, callback) function`);
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
RunSV.prototype.startPlan = function startPlan () {
	return this.dependencies.overallOrder();
};
RunSV.prototype.init = function init (callback) {
	return this.start(callback);
};
RunSV.prototype.start = function start (callback) {
	let i = 0;
	const self = this;
	assert(callback, 'callback is required');
	let plan;
	try {
		plan = self.startPlan();
	} catch (e) {
		// typically a circular dependency
		return callback(e);
	}

	function next (err) {

		if (err) {
			return callback(err);
		}
		const previous = plan[i - 1];

		if (previous) {
			self.emit('start', previous);
		}

		const name = plan[i++];

		if (!name) {
			return callback();
		}
		const service = self.services.get(name);
		const  dependencies = self.dependencies.dependenciesOf(name);
		const args = dependencies.length ? self.getClients(...dependencies) : null;

		if(isAsync(service.start)){
			service.start(args)
				.then(next)
				.catch(next);
		}else {
			service.start(args, next);
		}
	}
	next();
};
RunSV.prototype.stopPlan = function stopPlan () {
	return this.dependencies.overallOrder().reverse(); // stop the services in reverse order
};
RunSV.prototype.stop = function stop (callback) {
	var i = 0;
	const self = this;
	assert(callback, 'callback is required');
	const plan = self.stopPlan();

	function next (err) {
		const previous = plan[i - 1];

		if (previous) {
			self.emit('stop', previous);
		}
		const name = plan[i++];
		if (err) {
			return callback(err);
		}
		if (!name) {
			return callback();
		}
		const service = self.services.get(name);
		if(isAsync(service.stop)){
			service.stop().then(next).catch(next);
		}else{
			service.stop(next);
		}
	}
	next();
};
RunSV.prototype.async = function(){
	const self = this;
	function AsyncWrapper(){}
	AsyncWrapper.prototype = self;
	let ret = new AsyncWrapper();

	ret.start = async function wrapperStart(){
		let fn  = util.promisify(self.start).bind(self);
		return await fn();
	};
	ret.stop = async function wrapperStop(){
		let fn  = util.promisify(self.stop).bind(self);
		return await fn();
	};
	return Object.freeze(ret);
};

function create () {
	return new RunSV();
}
exports = module.exports = {
	create
};
