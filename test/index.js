'use strict';
const {
    create
} = require('..');
const assert = require('assert');
describe('SV', function () {
    before('setup and run', function (done) {
        var myAsyncReadyService = {
            name: 'myAsyncReadyService',
            start(services, callback) {
                myAsyncReadyService.started = true;
                setTimeout(callback, 100);
            },
            stop(callback) {
                myAsyncReadyService.stopped = true;
                setTimeout(callback, 100);
            }
        };
        this.myAsyncReadyService = myAsyncReadyService;
        var sv = create();
        sv.addService(myAsyncReadyService);
        sv.init(function (err) {
            sv.stop(done);
        });
    });
    it('can start a service', function () {
        assert(this.myAsyncReadyService.started);
    });
    it('can stop a service', function () {
        assert(this.myAsyncReadyService.stopped);
    });
});
describe('dependencies', function () {
    before('setup and run', function (done) {
        var self = this;
        self.started = [];
        self.stopped = [];
        var myAsyncReadyService = {
            name: 'myAsyncReadyService',
            start(services, callback) {
                self.started.push(myAsyncReadyService.name);
                return callback();
            },
            stop(callback) {
                self.stopped.push(myAsyncReadyService.name);
                return callback();
            }
        };
        var complexService = {
            name: 'complexService',
            start(services, callback) {
                self.started.push(complexService.name);
                return callback();
            },
            stop(callback) {
                self.stopped.push(complexService.name);
                return callback();
            }
        };
        this.complexService = complexService;
        this.myAsyncReadyService = myAsyncReadyService;
        var sv = create();
        sv.addService(complexService, myAsyncReadyService);
        sv.init(function (err) {
            sv.stop(done);
        });
    });
    it('can start a service with dependencies in the proper order', function () {
        assert.deepStrictEqual(this.started, ['myAsyncReadyService', 'complexService']);
    });
    it('can stop a service with dependencies in the proper order', function () {
        assert.deepStrictEqual(this.stopped, ['complexService', 'myAsyncReadyService']);
    });
});
