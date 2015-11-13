/**
 * Created by baodekang on 2015/10/28.
 */
var ES_CONSTANT = ES_CONSTANT || {};

ES_CONSTANT = {
    INDEX: 'finlog', //自定义数据 索引
    LOG_INDEX: 'logstash-*', //日志数据 索引
    ES_TYPE: {
        WARN_RULE: 'warnRule',
        DASHBOARD: 'dashboard',
        LOG_QRY: 'logqry'
    }
};

module.exports = ES_CONSTANT;
