'use strict';
const assert = require('assert');
const {promisify} = require('util');
const {create} = require('..');

const wait = promisify(function (callback){
	setImmediate(callback);
});

function createAsyncService(name){
	let client ={
		name,
		started: false,
		stopped: false
	};
	async function start(){
		client.started = true;
		await wait();
	}
	async function stop(){
		client.stopped = true;
		await wait();
	}
	function getClient(){
		return client;
	}
	return Object.freeze({
		name, 
		getClient,
		start,
		stop
	});
}

describe('Async/Await support',function(){
	it('should support async start/stop', async function (){
		const runsv = create().async();
		const [a, b] = ['a', 'b'].map(createAsyncService);
		runsv.addService(b);
		runsv.addService(a, b);
		await runsv.start();

		const clientA = runsv.getService('a').getClient();
		assert.deepStrictEqual(clientA.name, 'a');
		assert(clientA.started);

		const clientB = runsv.getService('b').getClient();
		assert.deepStrictEqual(clientB.name, 'b');
		assert(clientB.started);

		await runsv.stop();
		assert(clientA.stopped);
		assert(clientB.stopped);
	});
	it('should support async services', function(done){
		const runsv = create();
		const [a, b] = ['a', 'b'].map(createAsyncService);
		runsv.addService(b);
		runsv.addService(a, b);
		runsv.start(function(err){
			if(err){
				return done(err);
			}
			const clientA = runsv.getService('a').getClient();
			assert.deepStrictEqual(clientA.name, 'a');
			assert(clientA.started);

			const clientB = runsv.getService('b').getClient();
			assert.deepStrictEqual(clientB.name, 'b');
			assert(clientB.started);

			runsv.stop(function(err){
				assert(clientA.stopped);
				assert(clientB.stopped);
				return done(err);
			});
		});
	});
});
