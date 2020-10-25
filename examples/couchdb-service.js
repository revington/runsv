'use strict';
const assert = require('assert');
const COUCHDB = process.env.COUCHDB;
assert(COUCHDB, 'COUCHDB env var is required');
const db = require('nano')(COUCHDB);
const name = 'couchdb';

function create() {
    function start(_, callback) {
        db.get('_security', function (err, doc) {
            // ensure we can use the database
            return callback(err);
        });
    }

    function getClient() {
        return db;
    }

    function stop(callback) {
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
