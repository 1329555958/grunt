/**Created by weichunhe on 2015/8/17.*/
/*常量数据区*/
var EVENT = {
    TAB_SHOWN: {emit: 'TAB_SHOWN', broadcast: 'Tab_Shown'},
    CONDITION_AREA: {emit: 'SHOW_CONDITION_AREA', broadcast: 'Show_Condition_Area'},
    CONDITION_CHANGE: {emit: 'CONDITION_CHANGE', broadcast: 'Condition_Change'}, //条件改变了 事实
    CHANGE_CONDITION: {emit: 'CHANGE_CONDITION', broadcast: 'Change_Condition'}, //去改变条件 动作
    CHANGE_CONDITION_DISPLAY: {emit: 'CHANGE_CONDITION_DISPLAY', broadcast: 'Change_Condition_Display'} //改变条件显示名称
};
// localstorage key
var STORE = {
    CONDITION: 'condition_store',
    CONDITION_DISPLAY: 'condition_display_store',
    TIME_SLOT: 'time_slot'
};
define('app', ['util', 'base'], function (util) {
    //扩展工具方法到_
    util(_);

    var app = angular.module('app', ['ngExtend', 'ui.router', 'highcharts-ng', 'ui.ace', 'ngSanitize']);

    /**
     *弹出对话框
     * @param html 弹出的内容
     * @param close_callback 关闭对话框回调
     */
    app.dialog = function (html, close_callback) {
        var wrap = $.mask({maskHtml: html});

        function hide() {
            $.mask.hide();
            $(document).unbind('keydown.mask');
            wrap.unbind('click.mask');
            close_callback && close_callback();
        }

        setTimeout(function () {
            wrap.one('click.mask', function () {
                hide();
            });
            $(document).bind('keydown.mask', function (event) {
                var key = event.keyCode;
                if (key === 27) {
                    hide();
                }
            });
        }, 500);
    };
    var infodlg = null, infomsg = null;
    /**
     * 显示一些提示性信息
     * @param msg 要显示的提示信息
     * @param timeout 超时自动关闭时间，默认2000,0表示不进行自动关闭
     */
    app.info = function (msg, timeout) {
        timeout = timeout === undefined ? 2000 : timeout;
        if (!infodlg) {
            infodlg = $('#infodialog');
            infomsg = infodlg.find('#infomsg');
        }
        infomsg.text(msg);
        infodlg.show().find('.box').hide().slideDown(600);

        if (timeout > 0) {
            setTimeout(function () {
                app.info.hide();
            }, timeout);
        }
    };
    window.alert = app.info; //重写alert
    window.infoDlgHide = app.info.hide = function () {
        infodlg.find('.box').slideUp(600, function () {
            infodlg.hide();
        });
    };

    app.constant('VIEWS_BASE_PATH', '/public/views');
    app.config(function ($stateProvider, VIEWS_BASE_PATH, $controllerProvider, $filterProvider, $requireProvider, $urlRouterProvider, $provide) {
        app.register = {
            controller: $controllerProvider.register,
            filter: $filterProvider.register,
            factory: $provide.factory
        };

        //路由配置使用
        function resolve($q, url, deps) {
            var def = $q.defer();
            require(deps, function () {
                def.resolve();
            }, function () {
                def.resolve();
                console.warn(url + '没有对应的js依赖!');
            });
            return def.promise;
        }

        //处理url,添加后缀
        var suffix = '.html';

        function addSuffix(url) {
            if (url.indexOf('.') !== -1) {
                return url;
            }
            var index = url.indexOf('?');
            if (index === -1) {
                return url + suffix;
            } else {
                return url.substring(0, index) + suffix + url.substring(index);
            }
        }

        /**
         * 根据一定的规则取出依赖
         * abc/def/hg.html 以hg为依赖
         * @param url
         */
        function getDeps(url) {
            var dep = url;
            if (dep) {
                if (dep.indexOf('/') === 0) {
                    dep = dep.substring(1);
                }
                dep = dep.split(/[.\?]/)[0];
            }
            return [dep];
        }

        $urlRouterProvider.when(/^\/?$/, '/logqry');

        $stateProvider
        //默认规则配置
            .state('def', {
                url: '{url:[^@]*}',
                templateUrl: function ($stateParams) {
                    var url = VIEWS_BASE_PATH + $stateParams.url;
                    return addSuffix(url);
                },
                resolve: {
                    require: function ($q, $stateParams) {
                        return resolve($q, $stateParams.url, getDeps($stateParams.url));
                    }
                }
            });

    });

    return app;
});
//条件
require(['condition', 'app'], function (condition, app) {
    app.controller('conditionController', condition);
});

//初始化
define('init', ['app'], function (app) {
    app.controller('rootController', function ($rootScope) {
        var condition = {}; //保存当前条件信息
        //添加方法
        $rootScope.JSONStringify = JSON.stringify;
        //标签页切换
        $rootScope.$on(EVENT.TAB_SHOWN.emit, function (event, data) {
            $rootScope.$broadcast(EVENT.TAB_SHOWN.broadcast, data);
        });
        //条件区域的显示与隐藏
        $rootScope.$on(EVENT.CONDITION_AREA.emit, function (event, data) {
            $rootScope.$broadcast(EVENT.CONDITION_AREA.broadcast, data);
        });
        //条件改变
        $rootScope.$on(EVENT.CONDITION_CHANGE.emit, function (event, data) {
            condition = data;
            $rootScope.$broadcast(EVENT.CONDITION_CHANGE.broadcast, data);
        });
        //改变条件
        $rootScope.$on(EVENT.CHANGE_CONDITION.emit, function (event, data) {
            //通过指定名称获取条件信息
            if (angular.isString(data)) {
                $rootScope.$broadcast(data, condition);
                return;
            }
            $rootScope.$broadcast(EVENT.CHANGE_CONDITION.broadcast, data);
        });
        //标签页切换之后
        $(document).delegate('a[data-toggle="tab"]', 'shown.bs.tab', function (e) {
            $rootScope.$emit(EVENT.TAB_SHOWN.emit, e);
            setTimeout(function () {
                $(window).resize();
            }, 200);
        });
    });
});
require(['init'], function () {
    angular.element(document).ready(function () {
        //阻止 # 导航
        $(document).delegate('a', 'click', function (event) {
            var href = $(this).attr('href');
            if (href === '#') {
                event.preventDefault();
            }
        });
        angular.bootstrap(document, ['app']);
        if(window.__karma__){ //单元测试
            window.my$injector = angular.injector(['app']);
        }
    });

});