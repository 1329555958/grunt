/**
 * Created by weichunhe on 2015/7/6.
 */
(function (_t) {
    var min_suffix = _t.UGLIFY ? '-min' : '', //是否使用压缩文件
        ROOT = '/public/',
        BASE = ROOT + 'js' + min_suffix + '/',
        LIB = ROOT + 'lib/js' + '/',
        BOWER_ROOT = '/bower_components/';
    var config = {
        baseUrl: BASE
        , paths: {
            angular_ace_builds: BOWER_ROOT + 'ace-builds/src-min-noconflict/ace'
            , jquery: BOWER_ROOT + 'jquery/dist/jquery.min'
            , slider: BOWER_ROOT + 'seiyria-bootstrap-slider/dist/bootstrap-slider.min'
            , datepicker: BOWER_ROOT + 'bootstrap-datepicker/dist/js/bootstrap-datepicker.min'
            , dropdown: BOWER_ROOT + 'bootstrap/js/dropdown'
            , tab: LIB + 'tab'
            , mask: LIB + 'mask'
            , angular: BOWER_ROOT + 'angular/angular'
            , angular_sanitize: BOWER_ROOT + 'angular/angular-sanitize.min'
            , angular_ui_ace: BOWER_ROOT + 'angular-ui-ace/ui-ace.min'
            , route: BOWER_ROOT + 'angular-ui-router/release/angular-ui-router.min'
            , lodash: BOWER_ROOT + 'lodash/lodash.min'
            , dateutil: LIB + 'date-util'
            , highcharts: BOWER_ROOT + 'highcharts/highcharts'
            , highcharts_no_data: BOWER_ROOT + 'highcharts/modules/no-data-to-display'
            , highchartsNg: LIB + 'highcharts-ng'
            , extend: LIB + 'angular-extend'
            , base: LIB + (!_t.UGLIFY ? 'base' : 'index' ) //index 压缩后
        }
        , shim: {
            angular: {
                deps: ['jquery', 'angular_ace_builds']
            },
            angular_sanitize: {
                deps: ['angular']
            },
            angular_ui_ace: {
                deps: ['angular']
            },
            route: {
                deps: ['angular']
            }
            ,
            dropdown: {
                deps: ['jquery']
            }
            ,
            tab: {
                deps: ['jquery']
            }
            ,
            extend: {
                deps: ['angular', 'dropdown', 'tab', 'slider', 'datepicker']
            }
            ,
            mask: {
                deps: ['jquery']
            }
            ,
            highcharts: {
                deps: ['angular']
            }
            ,
            highchartsNg: {
                deps: ['highcharts']
            }
            ,
            highcharts_no_data: {
                deps: ['highcharts']
            },
            base: {
                deps: _t.UGLIFY ? ['angular_ace_builds'] : ['route', 'extend', 'mask', 'lodash', 'highcharts_no_data', 'highchartsNg', 'dateutil', 'angular_ui_ace', 'angular_sanitize']
            }
        }
    };
    /*运行karma测试*/
    if (_t.__karma__) {
        var TEST_REGEXP = /test\/.*\.js$/;
        var allTestFiles = [];
        Object.keys(_t.__karma__.files).forEach(function (file) {
            if (TEST_REGEXP.test(file)) {
                allTestFiles.push(file);
            }
        });
        //处理路径
        var prefix = '/base';
        config.baseUrl = prefix + config.baseUrl;
        Object.keys(config.paths).forEach(function (key) {
            config.paths[key] = prefix + config.paths[key];
        });
        //将mock文件加载进来

        console.log('执行的测试文件', allTestFiles);

        //添加测试依赖
        //config.shim.base.deps.push('angular_mock');
        config.shim.logqry = {deps:['app']};
        config.deps = allTestFiles;
        config.callback = _t.__karma__.start;
    }
    //运行grunt任务进行打包时使用
    if (typeof module !== 'undefined' && module.exports) {
        var _ = require('lodash');
        module.exports = config;
        module.exports.paths = _.omit(module.exports.paths, 'angular_mock'); //去除掉测试时的依赖
    } else {
        requirejs.config(config);
    }
})(this);
