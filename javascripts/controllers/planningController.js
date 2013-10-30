
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


    function getExtentsFromAssetsList(assets){
        var xmin =   Infinity,
            xmax = - Infinity,
            ymin =   Infinity,
            ymax = - Infinity;

        for (var i = 0; i < assets.length; i++) {
            xmin = assets[i].xmin < xmin ? assets[i].xmin : xmin ;
            ymin = assets[i].ymin < ymin ? assets[i].ymin : ymin ;
            xmax = assets[i].xmax > xmax ? assets[i].xmax : xmax ;
            ymax = assets[i].ymax > ymax ? assets[i].ymax : ymax ;
        }

        return { xmin: xmin, xmax:xmax, ymin:ymin, ymax:ymax };
    }

    $scope.openMission = function($index){
        var mission = $scope.missions[$index] ;
        mission.openned = mission.openned === true ? false : true ;

        if(mission.openned){
            if(!mission.pendingAssetsExtent || !mission.assetsCache ){
                Smartgeo.findAssetsByGuids($scope.site, mission.assets, function(assets){
                    mission.assetsCache         = assets ;
                    mission.pendingAssetsExtent = getExtentsFromAssetsList(assets);
                    $rootScope.$broadcast('HIGHLIGHT_ASSETS', mission.assetsCache);
                });
            } else {
                $rootScope.$broadcast('HIGHLIGHT_ASSETS', mission.assetsCache);
            }
        } else {
            $rootScope.$broadcast('UNHIGHLIGHT_ASSETS', mission.assetsCache);
        }
    };

    $scope.highlightMission = function($index){

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
