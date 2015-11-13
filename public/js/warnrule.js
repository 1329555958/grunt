/**
 * Created by weichunhe on 2015/10/21.
 */
require('app').register.controller('warnruleController', function ($scope, $myhttp) {
    $scope.showEdit = false;

    $scope.changeEdit = function (flag) {
        $scope.showEdit = flag;
    };

    $scope.confirmCfg = {
        //handle 获取到对话框句柄,可以通过 $scope.confirmCfg.handle.show(); 显示对话框
        msg      : '确认删除吗?', //确认信息 必选
        onclose  : function () {  //关闭时回调 可选
        },
        onconfirm: function () { //确认时回调 可选
            var data = {};
            if($scope.warnRule){
                if($scope.warnRule.id){
                    data = {
                        id: $scope.warnRule.id
                    };
                }
            }else{
                data = {
                    id: $scope._id
                };
            }
            if(data.id){
                $myhttp.post('/warnRule/delete',
                    JSON.stringify(data), function (response) {
                        if (!response.success) {
                            alert(response.message);
                        } else {
                            $scope.searchByCondition();
                        }
                    }, 'JSON');
            }
            $scope.warnRule = null;
            $scope.sliderOpts.value = 12.5;
            setDefaultStop();
            setDefaultWarning();
        }
    };

    var values = [{frequency: 1, frequencyUnit: 'min'},
        {frequency: 5, frequencyUnit: 'min'},
        {frequency: 10, frequencyUnit: 'min'},
        {frequency: 15, frequencyUnit: 'min'},
        {frequency: 30, frequencyUnit: 'min'},
        {frequency: 1, frequencyUnit: 'hr'},
        {frequency: 6, frequencyUnit: 'hr'},
        {frequency: 12, frequencyUnit: 'hr'},
        {frequency: 1, frequencyUnit: 'day'}];

    function getSliderPosition(frequency, frequencyUnit) {
        var index = -1;
        for (var i = 0; i < values.length; i++) {
            var value = values[i];
            if (value.frequency != frequency || value.frequencyUnit != frequencyUnit) {
                continue;
            }
            index = i;
            break;
        }
        if (index != -1) {
            return $scope.sliderOpts.ticks[index];
        }
        return null;
    };

    $scope.sliderOpts = {
        ticks          : [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100],
        ticks_positions: [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100],
        ticks_labels   : ['1<br><small>min</small>', '5<br><small>min</small>', '10<br><small>min</small>', '15<br><small>min</small>', '30<br><small>min</small>', '1<br><small>hr</small>', '6<br><small>hr</small>', '12<br><small>hr</small>', '1<br><small>day</small>'],
        step           : 12.5,
        value          : 12.5,
        tooltip        : 'hide'
    };

    $scope.add = function(){
        $scope.warnRule = null;
        $scope.changeEdit(true);
        $scope.sliderOpts.value = 12.5;
        setDefaultStop();
        setDefaultWarning();
        //initQueryFields();
    };

    /**
     * 查询基于查询字段
     * @param warnRule
     */
    function initQueryFields(){
        $myhttp.get('/logQry/loadQry',
            function (response) {
                $scope.fields = [];
                if(response.length > 0){
                    $scope.fields = response;
                }
            });
    };

    $scope.changeQueryField = function(){
        for(var i=0; i<$scope.fields.length; i++){
            if($scope.warnRule.queryField != $scope.fields[i].id){
                continue;
            }
            $scope.allFields = $scope.fields[i].allFields;

        }
    };

    $scope.saveOrUpdate = function (warnRule) {
        var data = {};
        if(warnRule){
            data = warnRule;
        }else{
            var value = values[($scope.warnRule && $scope.warnRule.frequency ? $scope.warnRule.frequency : $scope.sliderOpts.value) / $scope.sliderOpts.step],
                data = $.extend($scope.warnRule, value);
            data.warning = $scope.warningObj == warningObjs[0] ? true : false;
            data.disabled = $scope.stopObj == stopObjs[0] ? false : true;
        }
        $myhttp.post('/warnRule/saveOrUpdate',
            JSON.stringify(data), function (response) {
                if(!response.success){
                    alert(response.message);
                }else{
                    $scope.searchByCondition($scope.currentPage);
                    $scope.changeEdit(false);
                }
            });
    }

    $scope.searchByCondition = function (page) {
        var condition = {
            condition  : $scope.condition,
            currentPage: page ? page : 1,
            pageSize   : 10
        };
        $myhttp.post('/warnRule/search',
            JSON.stringify(condition), function (response) {
                if (!response.success) {
                    alert(response.message);
                } else {
                    $scope.page = response.info;
                    $scope.warnRules = $scope.page.records;
                }
            });
    };

    /** 警告类型
     * @type {{}}
     */
    $scope.warnTypes = [
        {css:'display: block', tooltip:'日志数', value:'1'},
        {css:'display: none', tooltip:'字段统计', value:'2'}
        //,
        //{css:'display: none', tooltip:'连续统计', value:'3'},
        //{css:'display: none', tooltip:'基线对比', value:'4'}
    ];

    /**
     * 字段统计维度
     * @type {*[]}
     */
    $scope.dimensions = [
        {tooltip:'非重复数', value:'1'},
        {tooltip:'总数', value:'2'},
        //{tooltip:'平均值', value:'3'},
        //{tooltip:'最大值', value:'4'},
        //{tooltip:'最小值', value:'5'}
    ];

    /**
     * 比较符
     * @type {*[]}
     */
    $scope.comSymbols = [
        {tooltip:'>', value:'gt'},
        {tooltip:'<', value:'lt'},
        {tooltip:'>=', value:'gte'},
        {tooltip:'<=', value:'lte'}
    ];

    $scope.changeWarnType = function(type){
        for(var i=0; i<$scope.warnTypes.length; i++){
            if($scope.warnTypes[i].value != type){
                $scope.warnTypes[i].css = 'display: none';
            }else{
                $scope.warnTypes[i].css = 'display: block';
            }
        }
    };

    var warningObjs = [{css:'fa-bell-slash-o', tooltip: '关闭告警'},
        {css:'fa-bell-o', tooltip: '打开告警'}];

    var stopObjs = [{css:'fa-ban', tooltip:'停用'},
        {css:'fa-check-circle-o', tooltip:'启用'}];

    $scope.changeWarning = function(){
        if($scope.warnRule && $scope.warnRule.id){
            $scope.switchWarning($scope.warnRule);
        }else{
            if($scope.warningObj == warningObjs[0]){
                $scope.warningObj = warningObjs[1];
            }else{
                $scope.warningObj = warningObjs[0];
            }
        }
    };

    $scope.switchWarning = function(warnRule){
        if(warnRule.warning){
            warnRule.warning = false;
        }else{
            warnRule.warning = true;
        }
        $scope.saveOrUpdate(warnRule);
    };

    $scope.swithStop = function(warnRule){
        if(warnRule.disabled){
            warnRule.disabled = false;
        }else{
            warnRule.disabled = true;
        }
        $scope.saveOrUpdate(warnRule);
    };

    $scope.changeStop = function(){
        if($scope.warnRule && $scope.warnRule.id){
            $scope.swithStop($scope.warnRule);
        }else{
            if($scope.stopObj == stopObjs[0]){
                $scope.stopObj = stopObjs[1];
            }else{
                $scope.stopObj = stopObjs[0];
            }
        }
    };

    function setDefaultStop(){
        $scope.stopObj = stopObjs[0];
    };

    function setDefaultWarning(){
        $scope.warningObj = warningObjs[0];
    };

    $scope.remove = function (_id) {
        $scope._id = _id;
        $scope.confirmCfg.handle.show();
    };

    $scope.queryByPage = function (page) {
        $scope.searchByCondition(page);
    };

    $scope.edit = function(warnRule){
        $scope.changeEdit(true);
        $scope.warnRule = $.extend({}, warnRule);
        $scope.sliderOpts.value = getSliderPosition(warnRule.frequency, warnRule.frequencyUnit);
        if($scope.warnRule.disabled){
            $scope.stopObj = stopObjs[1];
        }else{
            $scope.stopObj = stopObjs[0];
        }
        if($scope.warnRule.warning){
            $scope.warningObj = warningObjs[0];
        }else{
            $scope.warningObj = warningObjs[1];
        }
        $scope.changeWarnType(warnRule.type);
        $scope.changeQueryField();
    };

    initQueryFields();
    setDefaultStop();
    setDefaultWarning();
    $scope.searchByCondition();
});