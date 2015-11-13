/**
 * Created by weichunhe on 2015/10/22.
 * 日志查询
 */
require('app').register.controller('logqryTabController', function ($scope, $myhttp, $timeout) {
    //获取当前标签id
    var TabId = null;
    $('.tab-pane>.ng-scope').each(function () {
        var s = angular.element(this).scope();
        if (s.$id === $scope.$id) {
            TabId = $(this).parent('.tab-pane').attr('id');
        }
    });

    //加载事件
    var loadCfgDef = $.Deferred(), timeRangeDef = $.Deferred();

    var fieldData = {}; //保存查询到的字段数据
    var configData = {
        id: '', //配置 信息标识
        condition: {}, //已选条件
        showFields: []//选择显示的字段
        //sort: {field:,type:}
    }; //配置信息

    $scope.maxLengthField = ''; //保存最长字段，用于使options显示长度相同
    $scope.fieldSet = []; //能用于条件 的字段集
    $scope.hits = {hits: []}; //查询到的数据
    //要显示的字段
    var def_show_field = [],
        allFields = []; //字段查询后放入

    function reset() {
        $scope.condition = {};
        $scope.addedConds = [];
        $scope.hasCond = true; //还有添加可以添加
    }

    reset();

    var timeRange = {};//时间范围

    var eventName = 'OnReceive' + TabId;
    $scope.$on(eventName, function (event, data) {
        //只初始化一次
        if (!configData.id) {
            _.extend(configData, data);
            $scope.condition = configData.condition || {};
            $scope.addedConds = _.keys($scope.condition);
            if (!configData.sort || !configData.sort.field) {
                configData.sort = {field: '@timestamp', type: 'desc'};
            }
            $scope.sort = configData.sort;
        }
        loadCfgDef.resolve();
    });
    $scope.$emit('ConsumeAConfig', {tabId: TabId, eventName: eventName});

    var IsShownTab = $('#' + TabId).hasClass('active'); //是否是当前正在显示的标签页
    $scope.$on(EVENT.TAB_SHOWN.broadcast, function (event, data) {
        if (data.target.target === '#' + TabId) {
            IsShownTab = true;
            $scope.search();
        } else {
            IsShownTab = false;
        }
    });

    //加载字段
    $.when($myhttp.get('/logqry/fields', function (data) {
        fieldData = data.data;
        $scope.fieldSet = _.chain(fieldData).pick(function (p) {
            return p.type === 'string';
        }).keys().value();

        allFields = _.keys(fieldData);

        $scope.addCondition();

        configData.allFields = $scope.fieldSet;

        def_show_field = data.showFields; //查询出显示的字段
        $scope.maxLengthField = _.max($scope.fieldSet, function (f) {
                return f.length;
            }) + 'NN'; //加NN是要为了防止字数相同存在大小写宽度不同
    }));
    //添加一个条件，已经使用的条件不可再次添加
    $scope.addCondition = function () {
        var reminder_conds = $scope.getReminderFields();
        if (!$scope.hasCond) {
            return;
        }
        //此条件可选择的字段
        $scope.addedConds.push(reminder_conds[0]);
    };
    $scope.removeCond = function (index) {
        $scope.addedConds.splice(index, 1);
    };
    //获取还剩余的条件
    $scope.getReminderFields = function (field) {
        var fields = [];
        if (field) {
            fields.push(field);
        }
        var reminder_conds = _.difference($scope.fieldSet, $scope.addedConds);
        $scope.hasCond = !!reminder_conds.length;
        return fields.concat(reminder_conds);
    };

    function saveConfigData(data) {
        if (data) {
            _.extend(configData, data);
        }
        if (configData.id) {
            $scope.$emit('ToSaveConfig', configData);
        }
    }

    /**
     * 查询数据
     * @param append 是否进行追加
     */
    $scope.search = function (append, size) {
        if (!IsShownTab) {
            return;
        }
        append = append === undefined ? false : append;
        //构造高亮显示字段 配置
        var fields = {};
        _.each($scope.addedConds, function (f) {
            fields[f] = {a: 1}; //如果不包含一个属性，jQuery作为参数传递时会忽略掉，所以a是随意指定的，无特殊意义
        });
        //参数信息
        var param = {
            body: {
                highlight: {
                    require_field_match: 'true',
                    pre_tags: ['<mark>'], post_tags: ['</mark>'], fields: fields
                }
            },
            size: angular.isNumber(size) ? size : 10
        };
        var condition = configData.condition;
        if (append) { //追加就使用上次的条件信息
            param.from = $scope.hits.hits.length;
        } else {
            condition = _.pick($scope.condition, $scope.addedConds);
            //保存配置信息
            saveConfigData({condition: condition, sort: $scope.sort});
        }

        param.condition = condition;
        _.extend(param, timeRange);

        //排序
        param.sort = $scope.sort.field + ':' + $scope.sort.type;

        $scope.searching = true;
        $myhttp('searching', $scope).get('/logQry/qry', param, function (data) {
            if (append) {
                $scope.hits.hits = $scope.hits.hits.concat(replaceHighlightField(data).hits);
            } else {
                $scope.hits = replaceHighlightField(data);
            }
        });
    };

    $scope.changeSort = function (field) {
        //if (!_.contains(allFields, field)) {
        //    return;
        //}
        //同一字段改变顺序，否则倒序排列
        if ($scope.sort.field === field) {
            $scope.sort.type = $scope.sort.type === 'desc' ? 'asc' : 'desc';
        } else {
            $scope.sort.field = field;
            $scope.sort.type = 'desc';
        }
        $scope.search(false, _.get($scope, 'hits.hits.length', 10));
    };
    $scope.getSortClass = function (field) {
        if (_.contains(allFields, field)) {
            return $scope.sort.field === field ? ('sorting_' + $scope.sort.type) : 'sorting';
        }
        return '';
    };

    $scope.reset = function () {
        reset();
        $scope.addCondition();
    };
    //延时查询，用于监听 输入条件的改变
    var delaySearchQueue = [];
    $scope.delaySearch = function () {
        //先清空队列
        for (var i = 0; i < delaySearchQueue.length; i++) {
            $timeout.cancel(delaySearchQueue.shift());
        }
        delaySearchQueue.push($timeout($scope.search, 700));
    };
    //如果有高亮字段就替换到对应的字段上去
    function replaceHighlightField(data) {
        var hits = data && data.hits;
        if (!hits) {
            return;
        }
        _.each(hits, function (h) {
            if (h.highlight) {
                _.each(h.highlight, function (val, key) {
                    if (h[key]) {
                        h[key] = val[0];
                    }
                    if (h._source[key]) {
                        h._source[key] = val[0];
                    }
                });
                delete  h.highlight;
            }
        });
        return data;
    }

    $scope.getShowFields = function () {
        if (!configData.showFields.length) {
            configData.showFields = [].concat(def_show_field);
        }
        return configData.showFields;
    };
    $scope.getHidenFields = function () {
        return _.difference(allFields, configData.showFields);
    };
    $scope.addShowField = function (field) {
        configData.showFields.push(field);
        saveConfigData();
    };
    $scope.removeShowField = function (field) {
        var index = _.indexOf(configData.showFields, field);
        if (index !== -1) {
            configData.showFields.splice(index, 1);
            saveConfigData();
        }
    };
    $scope.getFieldData = function (field, rcd) {
        return field === '_source' ? getSourceData(rcd) : rcd._source[field];
    };
    function getSourceData(rcd) {
        var result = [];
        _.each(rcd, function (val, key) {
            result.push('<span class="field-key">' + key + ':</span>' + JSON.stringify(val).replace(/\\"/g, ''));
        });
        return result.join(' ');
    }

    $scope.aceJson = function (obj) {
        return JSON.stringify(obj, function (key, value) {
            return value;
        }, '\t');
    };
    //显示详细信息 状态保存
    $scope.showRecordDetail = {};

    function dealTimeRange(data) {
        timeRange = _.chain(data).pick('startTime', 'endTime').each(function (val, key, t) {
            t[key] = dateUtil.parse(val).getTime();
        }).value();
        console.log('timerange', timeRange);
    }

    $scope.$on(EVENT.CONDITION_CHANGE.broadcast, function (event, data) {
        dealTimeRange(data);
        if (timeRangeDef.state() !== 'pending') {
            $scope.search();
        }
    });
    $scope.$on(TabId, function (event, data) {
        dealTimeRange(data);
        timeRangeDef.resolve();
    });
    //初始化,指定事件名
    $scope.$emit(EVENT.CHANGE_CONDITION.emit, TabId);
    $.when(loadCfgDef, timeRangeDef).then($scope.search);
});
require('app').register.controller('logqryController', function ($scope, $myhttp) {
    $scope.tabPage = '/public/views/logqry_sub.html';
    $scope.tabConfig = {
        //addTab:function(tab){}, 指令执行完之后会生成此方法 tab = {id:,name:}
        newTabName: '新建查询',
        tabs: [],//已保存的查询
        templateUrl: $scope.tabPage,
        saveCallback: saveCallback,
        addCallback: addCallback,
        closeCallback: closeCallback,
        delCallback: delCallback
    };
    //标签页信息 保存
    var configData = {
        id: '', //配置 信息标识
        name: '',
        condition: {}, //已选条件
        showFields: [] //选择显示的字段
    }; //配置信息
    var UnbindTabIds = []; //保存所有未与页面绑定的标签

    $scope.$on('ToSaveConfig', function (event, data) {
        saveConfig(data);
    });


    //配置信息同步
    function saveConfig(data) {
        var old = _.find($scope.tabConfig.tabs, function (t) {
            return t.id === data.id;
        });
        if (!old) {
            return;
        }
        _.extend(old, data);
        //去掉angular的信息
        _.each(old, function (val, key) {
            if (_.startsWith(key, '$$')) {
                delete old[key];
            }
        });

        $myhttp.post('/es/update/finlog/logqry/' + old.id, JSON.stringify(old), function (data) {
            console.log('save success!', data);
        });
    }

    //查询已保存的数据
    function loadConfig() {
        $myhttp.get('/logQry/loadQry', function (data) {
            $scope.tabConfig.tabs = [];
            _.each(data, function (cfg) {
                $scope.tabConfig.addTab(cfg, true);
            });
        });
    }

    function saveCallback(tab) {
        saveConfig(tab);
    }

    function addCallback(tab) {
        UnbindTabIds.push(tab.id);
        saveConfig(tab);
    }

    function closeCallback(tab) {
        _.remove($scope.tabConfig.tabs, function (t) {
            return t.id === tab.id;
        });
    }

    function delCallback(tab) {
        $myhttp.post('/logQry/delQry', JSON.stringify({id: tab.id}), function (data) {
            console.log('删除查询', tab, data);
        });
    }

    //消费一个标签
    $scope.$on('ConsumeAConfig', function (event, data) {
        var tabid = data.tabId, cfg = null;
        //通过消费者
        if (tabid && _.remove(UnbindTabIds, function (id) {
                return id === tabid;
            }).length) {
            //获取配置信息
            cfg = _.find($scope.tabConfig.tabs, function (t) {
                return t.id === tabid;
            });
            cfg = cfg ? _.omit(cfg, 'name', 'oldName') : null;
        }
        $scope.$broadcast(data.eventName, cfg);
    });

    //开始初始化
    loadConfig();
});