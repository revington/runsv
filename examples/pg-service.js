'use strict';
const name = 'pg';
const Pool = require('pg').Pool;

function create () {
	var pool = new Pool();
	function start (_, callback) {
		pool.connect((err, client, release) => {
			if (err) {
				return callback(err);
			}
			release();
			return callback();
		});
	}

	function stop (callback) {
		pool.end(callback);
	}

	function getClient () {
		function Client () {}
		Client.prototype = pool;
		const ret = new Client();
		ret.query = function query (sql, params, callback) {
			this.connect(function (err, client, done) {
				if (err) {
					return callback(err);
				}
				client.query(sql, params, function (err, data) {
					done();
					return callback(err, data);
				});
			});
		};
		return ret;
	}

	return Object.freeze({
		name,
		start,
		stop,
		getClient
	});
}
exports = module.exports = create;
