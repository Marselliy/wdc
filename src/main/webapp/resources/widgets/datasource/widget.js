define([
    'angular',
    "/widgets/data-util/json-stat-data-provider.js",
    "/widgets/data-dialogs/bar-chart-dialog.js",
    "/widgets/data-util/adapter.js"

    ],
    function (angular) {

    var m = angular.module('app.widgets.datasource', [
        'app.widgets.data-util.json-stat-data-provider']);

        m.controller('DataSourceController',
            function($scope, $http, $window,  EventEmitter, APIProvider, JSONstatDataProvider){

                var eventEmitter = new EventEmitter($scope);
                $scope.url = $scope.widget.url;



                $scope.load = function (){

                    $http.get($scope.url).success(
                        function(data){

                            $scope.data = data;
                            if(JSONstatDataProvider.isCompatible(data)) {
                                $scope.provider = new JSONstatDataProvider($scope.data, $scope.url);
                                eventEmitter.emit('loadDataSuccess',$scope.provider);
                            }else{
                                alert("Not supported data format")
                            }
                        }
                    ).error(function (data, status) {
                            $window.alert('$http error ' + status + ' - cannot load data');
                        });
                }


                var p = new APIProvider($scope)
                    p.config(function(){
                        $scope.url = $scope.widget.url;
                        if (angular.isDefined($scope.url)) $scope.load();
                    })
                    .provide('appendListener', function (evt) {
                        console.log('appendListener',evt, $scope.provider)
                        //if(angular.isDefined($scope.provider))
                            eventEmitter.emit('loadDataSuccess',$scope.provider);
                    })
                    .provide('getDataProvider',function(evt){
                        return $scope.provider;
                    });
            }
        );
});
