
/*
*  Planning controller
*/

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission){

    'use strict';

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $scope.synchronize = function(){
        Mission.queryAll()
                .success( function(results){
                    $scope.missions = Mission.merge(results.results, Smartgeo.get('missions') );
                    /** TODO: n'afficher le message qui s'il y a eu des modifications */
                    alertify.log("Missions synchronisées");
                })
                .error( function(){
                    $scope.missions = Smartgeo.get('missions');
                    alertify.error('Erreur lors de la mise à jour des missions');
                    console.log(arguments);
                });
    };

    $scope.synchronize();

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

        if(mission.openned || !mission.assetsCache|| !mission.extent){
            if(!mission.pendingAssetsExtent || !mission.assetsCache ){
                Smartgeo.findAssetsByGuids($scope.site, mission.assets, function(assets){
                    console.log(assets);
                    if( assets.length === 0 ){
                        alertify.log("Les objets de cette missions n'ont pas été trouvés.");
                        return ;
                    }
                    mission.assetsCache         = assets ;
                    mission.pendingAssetsExtent = getExtentsFromAssetsList(assets);
                    mission.selectedAssets      = 0;
                    $scope.highlightMission(mission);
                    mission.extent = getExtentsFromAssetsList(mission.assetsCache);
                    $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
                });
            } else {
                $scope.highlightMission(mission);
            }
        } else {
            $rootScope.$broadcast('UNHIGHLIGHT_ASSETS', mission.assetsCache);
        }
    };

    $scope.locateMission = function($index){
        var mission = $scope.missions[$index] ;
        if(mission.extent){
            $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
        } else {
            alertify.log("Les objets de cette missions n'ont pas été trouvés.");
        }
    };

    $scope.highlightMission = function(mission){
        $rootScope.$broadcast('HIGHLIGHT_ASSETS_FOR_MISSION', mission, null,
            /** marker click handler */
            function(mission, asset){
                for (var i = 0; i < mission.assetsCache.length; i++) {
                    if(mission.assetsCache[i].id === asset.id){
                        mission.assetsCache[i].selected = !!!mission.assetsCache[i].selected ;
                        mission.selectedAssets += mission.assetsCache[i].selected ? 1 : -1   ;
                        $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_MISSION', mission.assetsCache[i]);
                        break;
                    }
                }
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            });
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
