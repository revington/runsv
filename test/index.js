'use strict';
const {
	create
} = require('..');
const assert = require('assert');
function createService (name, event) {
	return Object.freeze({
		name,
		start (services, callback) {
			event && event.start(name, services);
			return callback();
		},
		getClient () {
			event && event.getClient && event.getClient(name);
			return { name };
		},
		stop (callback) {
			event && event.stop(name);
			return callback();
		}
	});
}
describe('RunSV', function () {
	describe('basic behavior', function () {
		before('setup and run', function (done) {
			const self = this;
			self.events = {};
			const event = {
				start (name) { self.events.started = true; },
				stop (name) { self.events.stopped = true; }
			};
			const myAsyncReadyService = createService('myService', event);
			self.myAsyncReadyService = myAsyncReadyService;
			const sv = create();
			sv.addService(myAsyncReadyService);
			sv.start(function (err) {
				if (err) {
					throw err;
				}
				sv.stop(done);
			});
		});
		it('can start a service', function () {
			assert(this.events.started);
		});
		it('can stop a service', function () {
			assert(this.events.stopped);
		});
	});
	describe('execution plan', function () {
		before(function () {
			const runsv = create();
			const [a, b] =	['a', 'b'].map(name => createService(name));
			runsv.addService(a);
			runsv.addService(b, a);
			this.runsv = runsv;
		});
		describe('#startPlan()', function () {
			it('should return service start order', function () {
				const actual = this.runsv.startPlan();
				const expected = ['a', 'b'];
				assert.deepStrictEqual(actual, expected);
			});
		});
		describe('#stopPlan()', function () {
			it('should return service start order', function () {
				const actual = this.runsv.stopPlan();
				const expected = ['b', 'a'];
				assert.deepStrictEqual(actual, expected);
			});
		});
	});
	describe('#getClients([...only])', function () {
		it('should return all clients', function (done) {
			const sv = create();
			['a', 'b'].forEach(x => sv.addService(createService(x)));
			sv.start(function (err) {
				if (err) {
					throw err;
				}
				const clients = sv.getClients();
				assert.deepStrictEqual(Object.keys(clients).sort(), ['a', 'b']);
				assert.deepStrictEqual(clients.a.name, 'a');
				assert.deepStrictEqual(clients.b.name, 'b');
				sv.stop(done);
			});
		});
		it('when clients are specified it should only return those', function (done) {
			const sv = create();
			['a', 'b', 'c'].forEach(x => sv.addService(createService(x)));
			sv.start(function (err) {
				if (err) {
					throw err;
				}
				const clients = sv.getClients('a', 'c');
				assert.deepStrictEqual(Object.keys(clients).sort(), ['a', 'c']);
				assert.deepStrictEqual(clients.a.name, 'a');
				assert.deepStrictEqual(clients.c.name, 'c');
				sv.stop(done);
			});
		});
		it('it should only return existing clients', function (done) {
			const sv = create();
			['a'].forEach(x => sv.addService(createService(x)));
			const c = {
				name: 'c',
				start (_, callback) { callback(); },
				stop (callback) { callback(); }
			};
			delete c.getClient;
			sv.addService(c);
			sv.start(function (err) {
				if (err) {
					throw err;
				}
				const clients = sv.getClients();
				assert.deepStrictEqual(Object.keys(clients).sort(), ['a']);
				assert.deepStrictEqual(clients.a.name, 'a');
				sv.stop(done);
			});
		});
	});
	describe('#getService(name)', function () {
		it('should return that service', function () {
			const [a, b] = ['a', 'b'].map(x => createService(x));
			const sv = create();
			sv.addService(a);
			sv.addService(b);
			const service = sv.getService('b');
			assert(Object.is(service, b));
		});
	});
	describe('#listServices()', function () {
		it('should return a list of services', function () {
			const [a, b] = ['a', 'b'].map(x => createService(x));
			const sv = create();
			sv.addService(a);
			sv.addService(b);
			const actual = sv.listServices().sort();
			assert.deepStrictEqual(actual, ['a', 'b']);
		});
	});
	describe('dependencies', function () {
		before('setup and run', function (done) {
			const self = this;
			self.serviceEvents = { started: [], stopped: [] };
			const serviceEvent = {
				start (name, services) { self.serviceEvents.started.push([name, services]); },
				stop (name) { self.serviceEvents.stopped.push(name); }
			};
			const [a, b] = ['a', 'b'].map(x => createService(x, serviceEvent));
			const sv = create();
			// B depends on A
			sv.addService(b, a);
			sv.start(function (err) {
				if (err) {
					throw err;
				}
				sv.stop(done);
			});
		});
		it('should start a service with dependencies in the proper order', function () {
			assert.deepStrictEqual(this.serviceEvents.started.map(x => x[0]), ['a', 'b']);
		});
		it('should stop a service with dependencies in the proper order', function () {
			assert.deepStrictEqual(this.serviceEvents.stopped, ['b', 'a']);
		});
		describe('A service with dependencies', function () {
			it('should have access their clients', function () {
				const expected = [
					['a', null], // "a" receives no clients
					['b', { a: { name: 'a' } }] // "b" should get access to client of "a"
				];
				assert.deepStrictEqual(this.serviceEvents.started, expected);
			});
		});
		describe('Circular dependencies', function () {
			it('a -> a should fail', function (done) {
				const a = createService('a');
				const sv = create();
				// B depends on A
				sv.addService(a, a);
				sv.start(function (err) {
					assert.deepStrictEqual(err.message, 'Dependency Cycle Found: a -> a');
					done();
				});
			});
			it('a -> b -> c -> a should fail', function (done) {
				const self = this;
				self.serviceEvents = { started: [], stopped: [] };
				const serviceEvent = {
					start (name, services) { self.serviceEvents.started.push([name, services]); },
					stop (name) { self.serviceEvents.stopped.push(name); }
				};
				const [a, b, c] = ['a', 'b', 'c'].map(x => createService(x, serviceEvent));
				const sv = create();
				// B depends on A
				sv.addService(a, b);
				sv.addService(c, a);
				sv.addService(b, c);
				sv.start(function (err) {
					assert.deepStrictEqual(err.message, 'Dependency Cycle Found: a -> b -> c -> a');
					done();
				});
			});
		});
	});
	describe('Events', function () {
		before(function (done) {
			const self = this;
			self.start = [];
			self.stop = [];
			const [a, b, c] = ['a', 'b', 'c'].map(x => createService(x));
			const runsv = create();

			runsv.addService(b, a);
			runsv.addService(c, b);

			runsv.on('start', name => self.start.push(name));
			runsv.on('stop', name => self.stop.push(name));
			runsv.start(function () {
				runsv.stop(done);
			});
		});
		it('should emit start events', function () {
			const actual = this.start;
			const expected = ['a', 'b', 'c'];
			assert.deepStrictEqual(actual, expected);
		});
		it('should emit stop events', function () {
			const actual = this.stop;
			const expected = ['c', 'b', 'a'];
			assert.deepStrictEqual(actual, expected);
		});
	});
	describe('Errors', function () {
		describe('On service start error', function () {
			const expectedError = new Error('ooooops');
			const service = {
				name: 'failOnError',
				start (_, callback) {
					return callback(expectedError);
				},
				stop (callback) {
					callback();
				}
			};
			it('should callback that error', function (done) {
				const sv = create();
				sv.addService(service);
				sv.start(function (err) {
					assert(err === expectedError);
					done();
				});
			});
		});
		describe('On service stop error', function () {
			const expectedError = new Error('ooooops');
			const service = {
				name: 'failOnError',
				start (_, callback) {
					callback();
				},
				stop (callback) {
					return callback(expectedError);
				}
			};
			it('should callback that error', function (done) {
				const sv = create();
				sv.addService(service);
				sv.start(function (err) {
					assert(!err, 'unexpected error');
					sv.stop(function (err) {
						assert(err === expectedError);
						done();
					});
				});
			});
		});
	});
});
