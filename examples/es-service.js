'use strict';
const assert = require('assert');
const ELASTIC_SEARCH = process.env.ELASTIC_SEARCH;
assert(ELASTIC_SEARCH, 'ELASTIC_SEARCH env var required');
const {
	Client
} = require('@elastic/elasticsearch');

function create () {
	var client;
	const name = 'es';

	function start (_, callback) {
		client = new Client({
			node: ELASTIC_SEARCH,
			pingTimeout: 3000
		});
		client.ping(function (err) {
			if (err) {
				return callback(err);
			}
			client.indices.exists({
				index: 'profiles'
			}, function (err) {
				return callback(err);
			});
		});
	}

	function stop (callback) {
		return callback();
	}

	function getClient () {
		return client;
	}
	return Object.freeze({
		start,
		stop,
		getClient,
		name
	});
}
exports = module.exports = create;
