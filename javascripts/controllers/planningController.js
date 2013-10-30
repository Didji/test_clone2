
/*
*  Planning controller
*/

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission){

    'use strict';

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    Mission.queryAll()
        .success( function(results){
            $scope.missions = Mission.merge(results.results, Smartgeo.get('missions') );
        })
        .error( function(){
            $scope.missions = Smartgeo.get('missions');
            // Notify error ?
        });


    // function getExtentsFromAssetsList(assets){
    //     var xmin = Infinity ,
    //         xmax = - Infinity,
    //         ymin = Infinity,
    //         ymax = - Infinity

    // }

    $scope.openMission = function($index){
        $scope.missions[$index].openned = $scope.missions[$index].openned === true ? false : true ;
    };

    $scope.changeVisibility = function($index){
        $scope.missions[$index].icon = $scope.missions[$index].icon === 'fa-check-circle-o' ? 'fa-circle-o' : 'fa-check-circle-o' ;
    };

});

angular.module('smartgeomobile').factory('Mission', function($http, Smartgeo, $q){

    'use strict';

    var Mission = {
        query    : angular.noop ,
        queryAll : function(){
            return $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.showOT.json'));
        },
        merge : function(array1, array2){
            return array1 ;
        }
    };

    return Mission ;

});
