'use strict';
require('dotenv').config();
const assert = require('assert');
const redis = require('redis');
const REDIS = process.env.REDIS;
assert(REDIS, 'REDIS env var required');
const name = 'redis';

function create() {
    var client;

    function start(_, callback) {
        if (client) {
            throw new Error('already connected');
        }
        client = redis.createClient(REDIS);
        client.once('ready', callback);
    }

    function stop(callback) {
        client.quit(function (err) {
            client = null;
            return callback(err);
        });
    }

    function getClient() {
        return client;
    }
    return Object.freeze({
        name,
        start,
        stop,
        getClient
    });
}
exports = module.exports = create;
