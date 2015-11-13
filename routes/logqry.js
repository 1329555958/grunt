/**
 * Created by weichunhe on 2015/11/2.
 */
var express = require('express');
var http = require('http');
var router = express.Router();
var config = require('../config/config');
var client = require('../service/client/es');
var log = require('../service/log/log4js');
var _ = require('lodash');
var constant = require('../service/utils/EsConstant');
var beans = require('../service/utils/beans');
var fields = require('../service/constant/logqry');

//查询字段信息
router.get('/fields', function (req, res) {
    client.indices.getMapping({
        ignoreUnavailable: true,
        allowNoIndices: false,
        index: constant.LOG_INDEX
    }, function (err, body) {
        if (err) {
            res.json(beans.newErr(err.status, err.message));
            return;
        }
        //取出符合条件的字段
        var data = _.values(body) && _.get(_.values(body)[0], 'mappings.file.properties');
        var data = _.pick(data, fields.allFields);
        var allFields = _.keys(data);
        var showFields = _.intersection(allFields, fields.showFields);
        res.json({data: data, showFields: showFields});
    });
});

//查询
router.get('/qry', function (req, res) {
    var param = req.query;
    var condition = [];
    //构造查询条件
    if (param.condition) {
        _.each(param.condition, function (val, key) {
            condition.push(_.set({}, 'wildcard.' + key, val + '*'));
        });
        delete param.condition;
    }
    if (param.startTime) {
        condition.push(_.set({}, 'range.@timestamp.gte', param.startTime));
    }
    if (param.endTime) {
        condition.push(_.set({}, 'range.@timestamp.lte', param.endTime));
    }
    if (condition.length) {
        _.set(param, 'body.query.bool.must', condition);
    }
    param.index = constant.LOG_INDEX;
    console.log('logqry param', param);
    client.es_search(param, res);
});

//加载已保存的查询
router.get('/loadQry', function (req, res) {
    var param = {
        index: constant.INDEX,
        type: constant.ES_TYPE.LOG_QRY,
        size: 20, //最多查询20条
        sort: 'id:asc'
    };
    client.search(param).then(function (data) {
        res.json(_.pluck(data.hits.hits, '_source'));
    }, function (err) {
        log.error('日志查询--加载已保存查询时异常', err);
        res.json([]);
    });
});
//删除已保存的查询
router.post('/delQry', function (req, res) {
    var id = req.body.id;
    client.delete({
        index: constant.INDEX,
        type: constant.ES_TYPE.LOG_QRY,
        id: id
    }, function (err, response) {
        if (err) {
            console.trace(err);
            log.error('日志查询--删除已保存查询时异常', err);
            res.json(beans.newErr(err.status, err.message));
        } else {
            res.json(response);
        }
    });
});

module.exports = router;