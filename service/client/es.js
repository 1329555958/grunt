/**
 * Created by weichunhe on 2015/10/22.
 */
var elasticsearch = require('elasticsearch');
var config = require('../../config/config');
var beans = require('../utils/beans');
var log = require('../log/log4js');
var client = new elasticsearch.Client({
    host: config.es_url
    //log: 'trace'
});

//es 查询方法
client.es_search = function (opts, res) {
    client.search(opts || {}).then(function (body) {
        console.log('es search result:', body);
        res.json(body.hits);
    }, function (error) {
        console.trace(error.message);
        log.error('es serach error:', error);
        res.json(beans.newErr(error.status, error.message));
    });
};

module.exports = client;