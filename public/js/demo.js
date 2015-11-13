/**
 * Created by weichunhe on 2015/10/21.
 */
console.log('demo loaded!!!!');
require('app').register.controller('demoController',function($scope){
    $scope.name = 'wch';
    $scope.arr = ['_jse','aaa'];
});