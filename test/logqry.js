/**
 * Created by weichunhe on 2015/11/11.
 */

define(['app', 'logqry'], function () {

    describe('load all show fields', function () {
        var $myhttp = null, $rootScope = null, $controller;

        //$injector = angular.injector(['app']);
        require('app').register.controller('testCtrl', function (name) {
            console.log('controller', name);
        });
        my$injector.invoke(function (_$controller_, _$rootScope_, _$myhttp_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $myhttp = _$myhttp_;
        });

        it('tabPage should has', function () {
            var $scope = $rootScope.$new();
            $controller('logqryController',{$scope:$scope,$myhttp:$myhttp});
            expect($scope.tabPage).toBe('ddww');
        });

        it('should return [appName,hostName,message,level]', function (done) {
            $myhttp.get('/logqry/fields', function (data) {
                expect(_.keys(data).length).toBe(4);
                done();
            });
        });


        //it('fieldSet should be 4', function (done) {
        //    var $scope = null;
        //    inject(function ($rootScope, $controller, $myhttp, $timeout) {
        //        console.log($controller('rootController',{}));
        //        console.log($controller('logqryTabController',{}));
        //        //$scope = $rootScope.$new();
        //        //$controller('logqryTabController', {
        //        //    $scope: $scope,
        //        //    $myhttp: $myhttp,
        //        //    $timeout: $timeout
        //        //});
        //        //setTimeout(function () {
        //        //    expect($scope.fieldSet.length).toBe(4);
        //        //}, 1000);
        //    });
        //}, 2000);
    });
});