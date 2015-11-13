/**
 * Created by weichunhe on 2015/10/22.
 */
require('./app').register.controller('dashboardSubController', function ($scope,$myhttp) {
    $scope.showAdd = function(){
        $('#addDialog').show();
        $myhttp.get('/logQry/loadQry',function(data){
            console.log("日志查询完成");
            console.log(data);
            //TODO 将data赋值到自定义变量，以供select里的option使用

        });
    };
    $("button.btn.btn-box-tool").bind("click", function() {
            $("div.modal").hide()
        }
    );
});
require('./app').register.controller('dashboardController', function ($scope,$myhttp) {
    $scope.tabPage = '/public/views/dashboard_sub.html';

    $scope.tabConfig = {
        newTabName: '仪表盘',
        tabs: [],//已保存的查询
        templateUrl: $scope.tabPage,
        saveCallback: function (tab) {
            var tagEntity={id:tab.id,name:tab.name,$$hashKey:tab.$$hashKey};
            $myhttp.post('/dashboard/tag/saveOrUpdate',JSON.stringify(tagEntity),function(response){
                if(!response.success){
                    alert(response.message);
                }
            });
        },
        delCallback:function(tab){
            var tag={tagId:tab.id};
            $myhttp.post('/dashboard/tag/delete',JSON.stringify(tag),function(response){
                if(!response.success){
                    alert(response.message);
                }
            });
        }
    };

    $myhttp.post('/dashboard/tag/queryList',function(data){
        if (!data.message) {
            _.each(data, function (cfg) {
                $scope.tabConfig.addTab(cfg, true);
            });
        } else {
            console.log("加载标签出现异常，原因："+data.message);
            alert('加载标签出现异常!');
        }
    });


});


