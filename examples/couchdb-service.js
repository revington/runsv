'use strict';
const assert = require('assert');
const COUCHDB = process.env.COUCHDB;
assert(COUCHDB, 'COUCHDB env var is required');
const createClient = require('nano');
const name = 'couchdb';

function create () {
	var client;
	function start (_, callback) {
		client = createClient(COUCHDB);
		client.get('_security', function (err, doc) {
			// ensure we can use the database
			return callback(err);
		});
	}

	function getClient () {
		return client;
	}

	function stop (callback) {
		return callback();
	}
	return Object.freeze({
		name,
		start,
		stop,
		getClient
	});
}
exports = module.exports = create;
