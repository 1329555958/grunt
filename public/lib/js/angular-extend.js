/**
 * angular Js 扩展
 * Created by weichunhe on 2015/7/6.
 */
(function (window, angular, undefined) {
    'use strict';

    angular.module('ngExtend', ['ng']).
        provider('$require', function rq() {
            /**
             * 异步加载配置
             * @param deps 如果是单个依赖可以直接写名字,多个依赖使用数组,路径根据require配置
             * @returns {*}
             */
            this.require = function (deps) {
                if (angular.isString(deps)) {
                    deps = [deps];
                }
                return ['$rootScope', '$q', function ($rootScope, $q) {
                    var def = $q.defer();
                    require(deps, function () {
                        $rootScope.$apply(function () {
                            def.resolve();
                        });
                    });
                    return def.promise;
                }]
            };

            this.$get = function () {
                return this;
            }
        })
        /*图表组件公共设置*/
        .factory('MyChart', function () {
            //图表设置
            function getChartConfig(myScope, chartId) {
                var chartType = 'line';
                if (myScope && myScope[chartId] && myScope[chartId].options && myScope[chartId].options.chart) {
                    chartType = myScope[chartId].options.chart.type;
                }
                return {
                    options: {
                        random: _.random(1, 500),
                        legend: {
                            enabled: true
                        },
                        chart: {
                            type: chartType,
                        },
                        credits: {
                            enabled: true,
                            text: '维金APM',
                            href: 'http://www.vfinance.cn/'
                        },
                        colors: ['#DDDF00', '#24CBE5', 'red', 'purple', 'green', '#64E572'],
                        title: {
                            align: 'left',
                            text: ''
                        },
                        xAxis: {
                            labels: {
                                //maxStaggerLines: 2,
                                //overflow: false,
                                autoRotation: 0
                            }
                        },
                        yAxis: {
                            title: {
                                text: ''
                            }
                        },
                        tooltip: {
                            crosshairs: [{//控制十字线
                                width: 1,
                                color: "#CCC",
                                dashStyle: "longdash"
                            }]
                        },
                        plotOptions: {
                            series: {
                                stacking: chartType == 'area' ? "normal" : "",
                                marker: {
                                    enabled: false,
                                    radius: 2,
                                    lineWidth: 1,
                                    symbol: "diamond"
                                },
                                events: {
                                    legendItemClick: function (event) {
                                        for (var i = 0; i < this.chart.series.length; i++) {
                                            if (myScope[chartId].series[i].name == this.name) {
                                                myScope[chartId].series[i].visible = !this.chart.series[i].visible;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
            }

            //时间单位转换
            function convertUnit(unit) {
                if (unit == "MIN" || unit == "min" || unit == 12)
                    return "分钟";
                else if (unit == "HOUR" || unit == "hour" || unit == 10)
                    return "小时";
                else if (unit == "DAY" || unit == "day" || unit == 5)
                    return "天";
            }

            //获取时间间隔
            function getTimeIntervalEnum(condition, constantTimeIntervalEnum) {
                var unit = condition.unit.toUpperCase(), timeSlot = condition.timeSlot, timeIntervalEnum = unit + "_" + timeSlot;
                for (var key in constantTimeIntervalEnum) {
                    if (key != timeIntervalEnum) {
                        continue;
                    }
                    return constantTimeIntervalEnum[key];
                    break;
                }
                return "";
            }

            function chart(unit, condition, constantTimeIntervalEnum) {
                return {
                    getChartConfig: function () {
                        return getChartConfig(unit, condition);
                    }, convertUnit: function () {
                        return convertUnit(unit);
                    }, getTimeIntervalEnum: function () {
                        return getTimeIntervalEnum(condition, constantTimeIntervalEnum);
                    }
                };
            }

            return chart;
        }).
        factory('$myhttp', function ($rootScope) {
            function apply() {
                setTimeout(function () {
                    $rootScope.$apply();
                }, 300);
            }

            function err(xhr, status, err) {
                //if (xhr.responseText.indexOf('<title>登录</title>') > 0) {
                //    window.location.href = '/';
                //}
                console.error('$myhttp请求出错', xhr, status, err);
            }

            function get() {
                return $.get.apply(window, arguments).complete(apply).error(err);
            }

            function post() {
                return $.post.apply(window, arguments).complete(apply).error(err);
            }

            /**
             * 如果是事件名称，就会传播此事件，事件数据为 start，end
             * 如果有obj，此属性应为bool类型 就是将此对象上的此属性取反
             * @param name string 事件名称 或属性名称，如果传递了obj
             * @param obj object
             * @returns {{get: get, post: post}}
             */
            function http(name, obj) {
                if (angular.isString(name)) {
                    if (angular.isObject(obj)) {
                    } else {
                        $rootScope.$emit('HTTP_EVENT', {name: name, data: 'start'});
                    }
                }
                function complete() {
                    if (angular.isString(name)) {
                        if (angular.isObject(obj)) {
                            obj[name] = false;
                        } else {
                            $rootScope.$emit('HTTP_EVENT', {name: name, data: 'end'});
                        }
                    }
                    apply();
                }

                return {
                    get: function () {
                        return $.get.apply(window, arguments).complete(complete).error(err);
                    }, post: function () {
                        return $.post.apply(window, arguments).complete(complete).error(err);
                    }
                };
            }

            http.get = get;
            http.post = post;

            return http;
        }).
        //自定义图表
        directive('customerChart', function ($parse) {
            return {
                restrict: 'AE'
                , replace: true
                , template: '<div class="chart-tool">' +
                '<i class="fa chart-icon fa-plus data-tip" ng-hide="isInCustom" data-tip="添加到自定义总览" ng-click="addToCustomer();"></i> <i class="fa chart-icon fa-spinner fa-spin" ng-hide="!adding"></i> </div>'
                , scope: {
                    config: '='
                }
                , controller: function ($scope, $element, $attrs, $myhttp) {
                    $scope.isInCustom = true;
                    $scope.adding = false;
                    if ($scope.config && $scope.config.id) {
                        //查找是否已经存在
                        $myhttp.get('/user/charts/custom/' + $scope.config.id, function (data) {
                            if (data.info) {
                                $scope.isInCustom = true;
                            } else {
                                $scope.isInCustom = false;
                            }
                        }, 'JSON');
                    }
                    $scope.addToCustomer = function () {
                        $scope.isInCustom = true;
                        $scope.adding = true;
                        $scope.config.chartId = $scope.config.id;
                        $scope.config.canChangeType = $scope.config.can_change_type - 0;
                        $scope.config.loadProp = $scope.config.load_prop;
                        $scope.config.dataProp = $scope.config.data_prop;
                        $scope.config.deps = $scope.config.deps.join(',');
                        $scope.config.condition = JSON.stringify($scope.config.condition);
                        $myhttp('adding', $scope).post('/user/charts/custom', JSON.stringify($scope.config), function (data) {
                        }, 'JSON');
                    }
                }
            }
        }).
        //http://bootstrap-datepicker.readthedocs.org/en/latest/options.html#format
        directive('myCalendar', function ($parse) {
            return {
                restrict: 'AE'
                , replace: false,
                scope: {
                    ngModel: '=',
                    cfg: '='
                }
                , link: function (scope, element, attrs, controller) {
                    var $ipt = element;
                    //var modelGetter = $parse($ipt.attr('ng-model'));
                    //var modelSetter = modelGetter.assign;
                    var cfg = angular.extend({format: 'yyyy-MM-dd'}, scope.cfg);
                    element.datepicker(cfg);
                    element.bind('changeDate', function () {
                        scope.ngModel = dateUtil.format(element.datepicker('getDate'), cfg.format);
                        setTimeout(function () {
                            scope.$apply()
                        }, 100);
                    });
                    scope.$watch('cfg.startDate', function (date) {
                        cfg = angular.extend({format: 'yyyy-MM-dd'}, scope.cfg);
                        element.datepicker('setStartDate', date);
                        //默认选择日期
                        element.datepicker('setDate', dateUtil.format((cfg && cfg.startDate) || new Date(), cfg.format));
                    });
                }
            }
        }).
        //重写 tab,可以进行自由添加
        directive('myTab', function ($parse, $compile, $rootScope) {
            return {
                restrict: 'AE',
                replace: false,
                scope: {
                    config: '='
                    /**
                     * //addTab:function(tab){}, 指令执行完之后会生成此方法 tab = {id:,name:}
                     * newTabName: 新建 标签页时名称，默认 new tab
                     * tabs: //默认初始化的一些标签
                     * templateUrl: 模板
                     * addCallback: 添加完标签页回调
                     * saveCallback: 编辑完标签页名称的回调
                     * closeCallback: 关闭标签页时回调
                     * delCallback:删除标签时回调
                     * tabs：[{ //默认有哪些标签页
                     *  id:  标签页id
                     *  name：标签页的显示名称
                     * }]
                     */
                }
                , link: function (scope, element, attrs, controller) {
                    scope.config = scope.config || {};
                    scope.config.tabs = scope.config.tabs || [];
                    scope.config.newTabName = scope.config.newTabName || 'new tab';

                    var config = scope.config, $tabs = element.find('.nav-tabs:first'), $contents = element.find('.tab-content:first'), def_template = $contents.find('.tab-pane:first').html();
                    //添加标签页
                    var tab = [];
                    tab.push('<li ng-repeat="t in config.tabs"><a target="#{{t.id}}" data-toggle="tab">');
                    tab.push('    <span ng-if="!isTabEditing(t.id);">{{t.name}}</span>');
                    tab.push('    <input class="form-control" style="display: inline-block;width:150px;"  ng-model="t.name" ng-if="isTabEditing(t.id);"/>');
                    tab.push('    &nbsp;&nbsp;<i class="fa fa-edit" ng-if="!isTabEditing(t.id);" ng-click="editTab(t);"></i>');
                    tab.push('    <i class="fa fa-check" ng-if="isTabEditing(t.id);" ng-click="saveTab(t);"></i>');
                    tab.push('    &nbsp;&nbsp;<i class="fa fa-trash large" ng-click="removeTab(t,true);"></i>');
                    tab.push('    &nbsp;&nbsp;<i class="fa fa-remove large" ng-click="removeTab(t);"></i></a></li>');
                    $tabs.append($compile(tab.join(''))(scope));

                    //添加相应按钮
                    $tabs.append($compile('<li class="add-tab-btn"><button class="btn btn-success" ng-click="addTab();"><i class="fa fa-plus"></i></button></li>')(scope));

                    //生成标签页id
                    function makeId() {
                        return _.makeUniqueId('tab');
                    }

                    var tabEditing = {};
                    //标签页是否正在编辑
                    scope.isTabEditing = function (id, flag) {
                        return flag !== undefined ? tabEditing[id] = flag : tabEditing[id];
                    };
                    scope.editTab = function (tab) {
                        tab.oldName = tab.name;
                        scope.isTabEditing(tab.id, true);
                        selTab(tab.id);
                    };
                    scope.saveTab = function (tab) {
                        scope.isTabEditing(tab.id, false);
                        selTab(tab.id);
                        if (tab.oldName != tab.name) {
                            scope.config.saveCallback && scope.config.saveCallback(tab);
                        }
                    };
                    scope.removeTab = function (tab, toDel) {
                        var $t = get$tabById(tab.id);
                        if ($t.parent().hasClass('active')) {
                            selTab(); //选中第一个
                        }
                        $t.remove();
                        $contents.find('#' + tab.id).remove();
                        scope.config.closeCallback && scope.config.closeCallback(tab);
                        if (toDel) {
                            scope.config.delCallback && scope.config.delCallback(tab);
                        }
                    };
                    //notSel 添加之后是不选择
                    scope.config.addTab = scope.addTab = function (tab, notSel) {
                        tab = tab || {id: makeId(), name: config.newTabName};
                        var id = tab.id;

                        scope.config.tabs.push(tab);
                        var content = [];
                        content.push('<div class="tab-pane" ');
                        content.push('id="' + id + '" ');
                        content.push(' ng-include="\'' + config.templateUrl + '\'"');
                        content.push('>');
                        content.push('</div>');
                        scope.config.addCallback && scope.config.addCallback(tab);
                        $contents.append($compile(content.join(''))(scope));
                        //直接选择会出现，DOM元素还没有生产就已经执行了代码，没达到想要的结果
                        if (!notSel) {
                            setTimeout(function () {
                                selTab(id);
                            }, 300);
                        }
                    };

                    function selTab(id) {
                        get$tabById(id).click();
                    }

                    function get$tabById(id) {
                        if (id === undefined) { //不传id，默认返回第一个
                            return $tabs.find('a').first();
                        }
                        return $tabs.find('a[target=#' + id + ']');
                    }
                }
            }
        }).
        //自由栅格排列
    /**
     * my-gridster
     *  .grid
     *      .grid-zoomout 缩小
     *      .grid-zoomin 放大
     */
        directive('myGridster', function ($parse, $compile, $rootScope) {
            return {
                restrict: 'AE',
                replace: false
                , link: function (scope, element, attrs, controller) {
                    //缩小
                    element.delegate('.grid-zoomout', 'click', function () {
                        element.find('.grid').removeClass('col-md-12').addClass('col-md-6');
                        element.find('.zoom-in').removeClass('zoom-in').addClass('zoom-out');
                        //$(this).parents('.grid').removeClass('col-md-12 zoom-out').addClass('col-md-6 zoom-in');
                    });
                    //放大
                    element.delegate('.grid-zoomin', 'click', function () {
                        element.find('.grid').removeClass('col-md-12 odd-child').addClass('col-md-6');
                        element.find('.grid:odd').addClass('odd-child');
                        var $t = $(this);
                        //如果是第偶数个就向前移动一个进行排列
                        //setTimeout(function () {
                        var grid = $t.parents('.grid');
                        //if (grid.hasClass('odd-child')) {
                        //    grid.prev().before(grid[0]);
                        //}
                        //setTimeout(function () {
                        grid.removeClass('col-md-6').addClass('col-md-12');
                        grid.find('.zoom-out').removeClass('zoom-out').addClass('zoom-in');
                        //}, 300);
                        //}, 500);

                    });
                }
            }
        }).
        //确认对话框
        directive('myConfirm', function ($parse) {
            return {
                restrict: 'AE',
                replace: true,
                template: '<div class="modal"><div class="modal-dialog" style="text-align: center;"><div class="box box-warning" style="display: inline-block;width: auto;min-width: 300px;text-align: left;"><div class="box-header with-border"><h5 class="box-title">提示</h5><div class="box-tools"><button class="btn btn-box-tool" ng-click="close();"><i class="fa fa-times"></i></button></div></div><div class="box-body"><span class="msg" style=" line-height: 1.42857143;display: inline-block;padding-top:6px;padding-bottom:6px; font-weight:bold;">确认删除这条记录！</span><button class="btn btn-success pull-right" ng-click="confirm();"><i class="fa fa-check-circle"></i>&nbsp;&nbsp;确认</button></div></div></div></div>',
                scope: {
                    config: '='
                }
                , link: function (scope, element, attrs, controller) {
                    scope.config.handle = {
                        show: function () {
                            element.find('.msg').text(scope.config.msg);
                            element.show();
                        }
                    };
                    scope.close = function () {
                        element.hide();
                        scope.config.onclose && scope.config.onclose();
                    };
                    scope.confirm = function () {
                        element.hide();
                        scope.config.onconfirm && scope.config.onconfirm();
                    };
                }
            }
        }).
        //提示输入对话框
        directive('myPrompt', function ($parse) {
            return {
                restrict: 'AE',
                replace: true,
                template: '<div class="modal"><div class="modal-dialog" style="width: 400px;"><div class="box box-warning"><div class="box-header with-border"><h3 class="box-title"></h3><div class="box-tools" ng-click="close();"><i class="fa fa-times"></i></div></div><div class="box-body"><div class="form-group"><label class="msg"></label><input type="text" class="form-control" ng-model="config.value"></div><div><button class="btn btn-success pull-right" ng-click="confirm();"><i class="fa fa-check-circle"></i>&nbsp;&nbsp;确认</button></div></div></div></div></div>',
                scope: {
                    config: '='
                }
                , link: function (scope, element, attrs, controller) {
                    scope.config.handle = {
                        show: function () {
                            element.find('.box-title').text(scope.config.title);
                            element.find('.msg').text(scope.config.msg);
                            element.show();
                        }
                    };
                    scope.close = function () {
                        element.hide();
                        scope.config.onclose && scope.config.onclose();
                    };
                    scope.confirm = function () {
                        element.hide();
                        scope.config.onconfirm && scope.config.onconfirm();
                    };
                }
            }
        }).
        //切换按钮
        directive('btnToggle', function ($parse) {
            return {
                restrict: 'AE',
                replace: true,
                template: '<div class="btn-toggle" ng-class="{on:state,off:!state}" ng-click="toggle();"><i></i><span class="on"></span><span class="off"></span></div>',
                scope: {
                    state: '=',
                    onHandle: '&',
                    offHandle: '&'
                }
                , link: function (scope, element, attrs, controller) {
                    scope.toggle = function () {
                        var rt = true, state = !scope.state;
                        if (state && angular.isFunction(scope.onHandle)) {
                            rt = scope.onHandle();
                        } else if (!state && angular.isFunction(scope.offHandle)) {
                            rt = scope.offHandle();
                        }
                        /*if (rt !== false) {
                         scope.state = state;
                         }*/
                    }
                }
            }
        }).
        //https://github.com/seiyria/bootstrap-slider/
        directive('mySlider', function ($parse) {
            return {
                restrict: 'AE',
                replace: false,
                scope: {
                    opts: '=',
                    ngModel: '=',
                    refresh: '='
                }
                , link: function (scope, element, attrs, controller) {
                    var onslider = false, slider = null;
                    var opts = angular.extend({
                        formatter: function (value) {
                            return '' + value;
                        }
                    }, scope.opts);
                    slider = element.slider(opts);
                    scope.$watch('refresh', function (val) {
                        opts = angular.extend({
                            formatter: function (value) {
                                return '' + value;
                            }
                        }, scope.opts);
                        slider = element.slider(opts);
                    });
                    if (!onslider) {
                        onslider = true;
                        slider.on('change', function (value) {
                            value.value && (scope.ngModel = value.value.newValue, scope.opts.value = value.value.newValue);
                            scope.$apply();
                        });
                    }
                    scope.$watch('opts.value', function (value) {
                        slider.slider('setValue', value);
                    });
                }
            }
        }).
    /**
     * 日期指令
     * <div my-date class="input-append date input-prepend">
     <span class="add-on">起始时间</span>
     <input class="uneditable-input" type="text" value="" ng-model="curDate"/>
     <span class="add-on"><i data-time-icon="icon-time" data-date-icon="icon-calendar"></i></span>
     </div>
     */
        directive('myDate', function ($parse) {
            return {
                restrict: 'AE'
                , replace: false
                , link: function (scope, element, attrs, controller) {
                    var $ipt = element;
                    var modelGetter = $parse($ipt.attr('ng-model'));
                    var modelSetter = modelGetter.assign;
                    element.datepicker();
                    element.bind('changeDate', function () {
                        modelSetter(scope, element.find('input').val());
                        scope.$digest();
                        /* 与上面两句 作用相同，$apply 会调用$digest 方法
                         scope.$apply(function(){
                         modelSetter(scope,element.find('input').val());
                         });
                         */
                    });
                }
            }
        }).
        //图表
        directive('chart', function ($compile) {
            return {
                replace: false
                , link: function (scope, element, attrs, controller) {
                    var html = [];
                    html.push('<highchart');
                    angular.forEach(attrs, function (a, k) {
                        var val = a, key = k;
                        if (key.indexOf('$') === 0 || key === 'chart') {
                            return;
                        }
                        if (key === 'id' || key === 'ngId') {
                            key = 'id';
                            val = attrs.ngId || attrs.id;
                        } else if (key === 'config' || key === 'ngConfig') {
                            key = 'config';
                            val = attrs.ngConfig || attrs.config;
                        }
                        html.push(key + '=' + '"' + val + '"');
                    });
                    html.push('></highchart>');
                    element.append($compile(html.join(' '))(scope));
                }
            }
        }).
    /**
     * 分页指令
     * <pagination total-page="pagination.totalPage" current-page="pagination.currentPage"
     on-select-page="query(page)"></pagination>
     */
        directive('pagination', function () {
            return {
                restrict: 'E'
                ,
                replace: true
                ,
                template: '<div class="dataTables_paginate paging_simple_numbers">                                         ' +
                '  <ul class="pagination">                                                           ' +
                '    <li class="paginate_button previous " ng-class="{disabled:noPrev()}"><a href="#" ng-click="selectPage(1)"  title="首页">1</a></li>                                ' +
                '    <li class="paginate_button previous " ng-class="{disabled:noPrev()}"><a href="#" ng-click="prev()" title="上一页"><</a></li>                                ' +
                '    <li class="paginate_button" ng-repeat=" page in pages" ng-class="{active:isActive(page)}"><a href="javascript:void(0);" ng-click="selectPage(page)">{{page}}</a></li> ' +
                '    <li class="paginate_button next" ng-class="{disabled:noNext()}"><a href="#" ng-click="next()" title="下一页">></a></li>                                ' +
                '    <li class="paginate_button next" ng-class="{disabled:noNext()}"><a href="#" ng-click="selectPage(totalPage)"  title="尾页">{{totalPage||1}}</a></li>                                ' +
                '  </ul>                                                          ' +
                '</div>                                                           '

                ,
                scope: {
                    totalPage: '='
                    , currentPage: '='
                    , onSelectPage: '&'
                },
                link: function (scope, element, attrs, controller) {
                    scope.currentPage = scope.currentPage || 1;
                    scope.$watch('currentPage', function (value) {
                        scope.pages = getPageItems(scope.totalPage, value, 10);
                        if (scope.currentPage > scope.totalPage) {
                            scope.currentPage = scope.totalPage;
                        }
                    });
                    scope.$watch('totalPage', function (value) {
                        scope.pages = getPageItems(value, scope.currentPage, 10);
                        if (scope.currentPage > value) {
                            scope.currentPage = value;
                        }
                    });
                    scope.isActive = function (page) {
                        return scope.currentPage === page;
                    };
                    scope.selectPage = function (page) {
                        if (page < 1) {
                            page = 1;
                        }
                        if (page > scope.totalPage) {
                            page = scope.totalPage;
                        }
                        if (!scope.isActive(page)) {
                            scope.currentPage = page;
                            scope.onSelectPage({page: scope.currentPage});
                        }
                    };
                    scope.prev = function () {
                        scope.selectPage(scope.currentPage - 1);
                    };
                    scope.next = function () {
                        scope.selectPage(scope.currentPage + 1);
                    };

                    scope.noPrev = function () {
                        return !(scope.currentPage > 1);
                    };
                    scope.noNext = function () {
                        return !(scope.currentPage < scope.totalPage);
                    };
                }
            }
        })
    /**
     *treeTable
     */
        .directive('treeTable', function ($compile) {
            return {
                restrict: 'AE',
                replace: true,
                transclude: true,
                link: function (scope, element, attrs) {
                    var treeId = attrs.treeId;
                    var treeModel = attrs.treeModel;
                    var nodeId = attrs.nodeId || 'id';
                    var nodeLabel = attrs.nodeLabel || 'label';
                    var nodeChildren = attrs.nodeChildren || 'childs';
                    var template = '<ul class="table2" ng-repeat="node in ' + treeModel + '">' +
                        '    <li class="name1" style="text-align: left;">' +
                        '        <span ng-repeat="item in node.levels"><span style="padding-left: 20px;"></span></span><span style="cursor: pointer;" title="{{node.' + nodeLabel + '}}" ng-click="' + treeId + '.selectNode(node)">' +
                        '        <i class="fa fa-caret-right" ng-show="node.' + nodeChildren + '.length && node.collapsed"></i>' +
                        '        <i class="fa fa-caret-down" ng-show="node.' + nodeChildren + '.length && !node.collapsed"></i>' +
                        '        {{node.' + nodeLabel + '| limitTo : 50 }}</span><span ng-show="node.' + nodeLabel + '.length>50">...</span>' +
                        '    </li>' +
                        '    <li class="name2">{{node.duration}}</li>' +
                        '    <li class="name3">' +
                        '        <div class="progress" style="margin-top: 5px;">' +
                        '            <div class="progress-bar progress-bar-green" style="width: {{node.durationPercent}}%">' +
                        '                <div>{{node.durationPercent}}%</div>' +
                        '            </div>' +
                        '        </div>' +
                        '    </li>' +
                        '    <li class="name2"><span style="cursor: pointer;" title="查看参数" ng-click="' + treeId + '.selectMsg(node)">' +
                        '<i class="fa fa-search" ng-show="node.tracerParameters && !node.tracerParameters.sql_obfuscated"></i>' +
                        '<i class="fa fa-database" ng-show="node.tracerParameters.sql_obfuscated"></i></span>&nbsp;</li>' +
                        '    <li class="name2">{{node.entryTimestamp}}ms</li>' +
                        '    <ul class="table3" ng-show="node.showMsg">' +
                        '        <li class="name4">' +
                        '<div>' +
                        '    <div ng-show="node.tracerParameters.exec_context">' +
                        '        <strong>Parameters</strong>' +
                        '        <div class="treetable_msg">' +
                        '           Async context &nbsp;{{node.tracerParameters.exec_context}}' +
                        '        </div>' +
                        '    </div>' +
                        '    <div ng-show="node.tracerParameters.backtrace">' +
                        '        <strong>Stack trace</strong>' +
                        '        <div class="treetable_msg">' +
                        '            <p ng-repeat="trace in node.tracerParameters.backtrace">{{trace}}</p>' +
                        '        </div>' +
                        '    </div>' +
                        '    <div ng-show="node.tracerParameters.sql_obfuscated">' +
                        '        <strong>SQL query</strong>' +
                        '        <div class="treetable_msg">' +
                        '            {{node.tracerParameters.sql_obfuscated}}' +
                        '        </div>' +
                        '    </div>' +
                        '</div>' +
                        '        </li>' +
                        '    </ul>' +
                        '<div tree-table tree-id="' + treeId + '" tree-model="node.' + nodeChildren + '" node-label="' + nodeLabel + '" node-children="' + nodeChildren + '" ng-hide="node.collapsed">' + '</div>' +
                        '</ul>';
                    if (treeId && treeModel) {
                        scope[treeId] = scope[treeId] || {};
                        scope[treeId].selectNode = scope[treeId].selectNode || function (node) {
                                node.collapsed = !node.collapsed;
                            };
                        scope[treeId].selectMsg = scope[treeId].selectMsg || function (node) {
                                node.showMsg = !node.showMsg;
                            };
                        //渲染
                        element.append($compile(template)(scope));
                    }
                }
            };
        });

    /**
     * 获取length个要展示的页面span
     */
    function getPageItems(total, current, length) {
        var items = [];
        if (length >= total) {
            for (var i = 1; i <= total; i++) {
                items.push(i);
            }
        } else {
            var base = 0;
            //前移
            if (current - 0 > Math.floor((length - 1) / 2)) {
                //后移
                base = Math.min(total, current - 0 + Math.ceil((length - 1) / 2)) - length;
            }
            for (var i = 1; i <= length; i++) {
                items.push(base + i);
            }
        }
        return items;
    }

})
(window, window.angular);
