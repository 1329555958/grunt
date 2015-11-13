#!/usr/bin/env node

/**
 * Module dependencies.
 */
var app = require('../app');
var debug = require('debug')('vflog:server');
var http = require('http');
var WarnRuleCorn = require('../service/cron/WarnRuleCron');
var WarnRuleEnum = require('../service/constant/WarnRuleEnum')
var config = require('../config/config');
var cluster = require('cluster');
var log = require('../service/log/log4js');

if (!config.is_debug && cluster.isMaster) {
    var numCPUs = require('os').cpus().length;

    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    /**
     * 添加定时任务
     */
    for (var i = 0; i < WarnRuleEnum.length; i++) {
        var warnRuleCorn = new WarnRuleCorn(WarnRuleEnum[i]);
        warnRuleCorn.addJob();
    }

    cluster.on('exit', function (worker, code, signal) {
        log.error('worker ' + worker.process.pid + ' died');
        cluster.fork();
    });
    return;
}

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(config.port || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
