var express = require('express');
var router = express.Router();
var config = require('../config/config');

router.get('/', function (req, res, next) {
    var url = '/index';
    if (req.headers.host.startsWith('localhost')) { //本地请求就使用home，非压缩版本
        url = '/home';
    }
    res.redirect(url);
});
/* GET home page. */
router.get(/^\/(home|index)$/, function (req, res, next) {
    res.sendFile(config.home_page);
});

module.exports = router;
