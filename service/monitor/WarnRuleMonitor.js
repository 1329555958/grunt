/**
 * Created by baodekang on 2015/11/3.
 */
var client = require('../client/es');
var ES_CONSTANT = require('../utils/EsConstant');
var moment = require('moment');
var MailUtil = require('../utils/MailUtil');
var _ = require('lodash');
module.exports = function (warnRule) {

    this.warnRule = warnRule;

    /**
     * 根据id查询log条件
     */
    this.searchLogQryById = function (callback) {
        client.search({
            index: ES_CONSTANT.INDEX,
            type : ES_CONSTANT.ES_TYPE.LOG_QRY,
            body : {
                query: {
                    term: {
                        _id: this.warnRule.queryField
                    }
                }
            }
        }, function (err, response) {
            if (err) {
                console.error(err);
            } else {
                var hits = response.hits.hits;
                var condition = {};
                if (hits.length > 0) {
                    condition = hits[0]._source.condition;
                }
                callback(condition);
            }
        });
    };

    /**
     * 警告类型：日志数
     */
    this.logNumber = function (_this) {
        _this.searchLogQryById(function (condition) {
            var index = 'logstash-' + moment().format('YYYY.MM.DD'),
                endTime = moment().valueOf(),
                startTime = moment().add(-1 * warnRule.minutes, 'minutes').valueOf(),
                query = {};
            _.set(query,'bool.must',[]);
            query.bool.must.push({range: {'@timestamp': {'gte': startTime, 'lte': endTime}}});
            if (condition) {
                _.each(condition,function(val,key){
                    query.bool.must.push(_.set({},'regexp.'+key,'.*' +val + '.*'));
                });
            }

            client.count({
                index: index,
                body : {
                    query: query
                }
            }, function (err, response) {
                if (err) {
                    console.error(err);
                } else {
                    _this.process(response.count, _this);
                }
            });
        });
    };

    /**
     * 警告类型：字段统计
     */
    this.fieldCount = function (_this) {
        _this.searchLogQryById(function (condition) {
            var index = 'logstash-' + moment().format('YYYY.MM.DD'),
                dimension = warnRule.dimension,
                endTime = moment().valueOf(),
                startTime = moment().add(-1 * warnRule.minutes, 'minutes').valueOf(),
                query = {};
            _.set(query,'bool.must',[]);
            query.bool.must.push({range: {'@timestamp': {'gte': startTime, 'lte': endTime}}});
            if (condition) {
                _.each(condition,function(val,key){
                    query.bool.must.push(_.set({},'regexp.'+key,'.*' +val + '.*'));
                });
            }

            /**
             * 非重复数
             */
            if (dimension == '1') {
                client.search({
                    index: index,
                    body : {
                        query       : query,
                        aggregations: {
                            aggs: {
                                cardinality: {
                                    field: warnRule.fieldName
                                }
                            }
                        }
                    }
                }, function (err, response) {
                    if (err) {
                        console.error(err);
                    } else {
                        _this.process(response.aggregations.aggs.value, _this);
                    }
                });
            }
            /**
             * 总数
             */
            else if (dimension == '2') {
                client.search({
                    index: index,
                    body : {
                        query       : query,
                        aggregations: {
                            aggs: {
                                terms: {
                                    field: warnRule.fieldName,
                                    size : 0
                                }
                            }
                        }
                    }
                }, function (err, response) {
                    if (err) {
                        console.error(err);
                    } else {
                        _this.process(response.hits.total, _this);
                    }
                });
            } else {
                console.error('dimension not exists:' + dimension);
            }
        });
    };

    this.process = function (count, _this) {
        var comSymbol = warnRule.comSymbol,
            peckValue = warnRule.peakValue;
        //3.检查：实际值与预估对比
        switch (comSymbol) {
            case 'gt':
                if (count > peckValue) {
                    _this.processError(warnRule, '大于', _this);
                } else {
                    _this.proessSuccess(warnRule, '大于', _this);
                }
                break;
            case 'lt':
                if (count < peckValue) {
                    _this.processError(warnRule, '小于', _this);
                } else {
                    _this.proessSuccess(warnRule, '小于', _this);
                }
                break;
            case 'gte':
                if (count >= peckValue) {
                    _this.processError(warnRule, '大于等于', _this);
                } else {
                    _this.proessSuccess(warnRule, '大于等于', _this);
                }
                break;
            case 'lte':
                if (count <= peckValue) {
                    _this.processError(warnRule, '小于等于', _this);
                } else {
                    _this.proessSuccess(warnRule, '小于等于', _this);
                }
                break;
        }
    };

    /**
     * 错误处理
     */
    this.processError = function (warnRule, comSymbolStr, _this) {
        //cancel warning
        if (!warnRule.warning) {
            return;
        }
        //status == false
        if (!warnRule.status) {
            return;
        }
        var html = '用户您好，<br/>您设置的日志警告:“' + warnRule.name + '”,在' + moment().format('YYYY-MM-DD HH:mm:ss') + '触发了警告。<br/>监控条件为：',
            type = warnRule.type;
        if (type == '1') {
            html += '日志数在' + warnRule.minutes + '分钟内' + comSymbolStr + warnRule.peakValue;
        } else if (type == '2') {
            html += warnRule.fieldName + '在' + warnRule.minutes + '分钟内,' + warnRule.dimension == '1' ? '非重复数' : '总数' + comSymbolStr + warnRule.peakValue;
        }
        var info = {
            to     : warnRule.email,
            subject: '【日志警告】警告触发-' + warnRule.name,
            html   : html
        }
        //1.send mail(警告邮件)
        MailUtil.sendMail(info);
        //2.update WarnRule(status, lastTime)
        warnRule.status = false;
        warnRule.lastTime = moment().format('YYYY-MM-DD HH:mm:ss');
        _this.updateWarnRule(warnRule);
    };

    this.proessSuccess = function (warnRule, comSymbolStr, _this) {
        //cancel warning
        if (!warnRule.warning) {
            return;
        }
        //status == true
        if (warnRule.status) {
            return;
        }
        var html = '用户您好，<br/>您设置的日志警告:“' + warnRule.name + '”,在' + moment().format('YYYY-MM-DD HH:mm:ss') + '恢复正常。<br/>监控条件为：',
            type = warnRule.type;

        if (type == '1') {
            html = html + '日志数在' + warnRule.minutes + '分钟内' + comSymbolStr + warnRule.peakValue;
        } else if (type == '2') {
            html = html + warnRule.fieldName + '在' + warnRule.minutes + '分钟内,' + warnRule.dimension == '1' ? '非重复数' : '总数' + comSymbolStr + warnRule.peakValue;
        }
        var info = {
            to     : warnRule.email,
            subject: '【日志警告】警告触发-' + warnRule.name,
            html   : html
        }
        //1.send mail (恢复邮件)
        MailUtil.sendMail(info);
        //2.update WarnRule(status, lastTime)
        warnRule.status = true;
        warnRule.lastTime = moment().format('YYYY-MM-DD HH:mm:ss');
        _this.updateWarnRule(warnRule);
    };

    this.updateWarnRule = function (warnRule) {
        client.update({
            index  : ES_CONSTANT.INDEX,
            type   : ES_CONSTANT.ES_TYPE.WARN_RULE,
            id     : warnRule.id,
            body   : {
                doc: warnRule
            },
            refresh: true
        }, function (err, response) {
            if (err) {
                console.error('failed to update warnRule:' + err);
            }
        });
    }
}