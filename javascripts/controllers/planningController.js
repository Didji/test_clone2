
/*
*  Planning controller
*/

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission, $location, $filter){

    'use strict';

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $scope.dayToDisplay = Smartgeo.get('lastUsedPlanningDate') || (new Date()).getTime(); // TODO : recuperer la derniere date utilisé ?

    var DAY_TO_MS = 86400000 ;

    $scope.remove1day = function(){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay -= DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0 &&
            $scope.dayToDisplay > $scope.minimumTime ){
            $scope.remove1day();
        } else if($scope.dayToDisplay <= $scope.minimumTime) {
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
            updateCount($scope.missions, $scope.dayToDisplay);
        }
    };

    $scope.gototoday = function(){
        $scope.dayToDisplay = (new Date()).getTime();
        Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        updateCount($scope.missions, $scope.dayToDisplay);
    };

    $scope.add1day = function(){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay += DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0 &&
            $scope.dayToDisplay < $scope.maximumTime ){
            $scope.add1day();
        } else if($scope.dayToDisplay >= $scope.maximumTime) {
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
            updateCount($scope.missions, $scope.dayToDisplay);
        }
    };

    var reports  = Smartgeo.get('reports'), missions = Smartgeo.get('missions');

    for(var i in reports){
        if(missions[reports[i].mission]){
            var pendingAssets = reports[i].assets,
                mission = missions[reports[i].mission] ;
            for(var j = 0 , length = mission.assets.length; j < length ; j++){
                if( pendingAssets.indexOf(mission.assets[j]) !== -1){
                    mission.done.push(mission.assets[j]);
                    mission.assets.splice(j--, 1);
                    length--;
                }
            }
        }
    }

    $scope.missions = missions;

    $scope.synchronize = function(){
        Mission.queryAll()
                .success( function(results){
                    // calculer les extremums;
                    $scope.missions = results.results;
                    setExtremum($scope.missions);
                    updateCount($scope.missions);
                    Smartgeo.set('missions', $scope.missions);
                })
                .error( function(){
                    /* TODO : n'afficher le message que lorsque l'on est en ligne */
                    alertify.error('Erreur lors de la mise à jour des missions');
                });
    };

    /* TODO : il faut envoyer les CR en attente avant de recupérer les missions */
    $scope.synchronize();

    function setExtremum(missions){
        $scope.minimumTime =  Infinity;
        $scope.maximumTime = -Infinity;
        for(var i in missions){
            if( $filter('customDateFilter')(missions[i].begin) < $scope.minimumTime ){
                $scope.minimumTime = $filter('customDateFilter')(missions[i].begin);
            }
            if( $filter('customDateFilter')(missions[i].begin) > $scope.maximumTime ){
                $scope.maximumTime = $filter('customDateFilter')(missions[i].begin);
            }
        }
    }
    function updateCount(missions, today){
        today = today || $scope.dayToDisplay ;
        $scope.beforeToday =  0 ;
        $scope.afterToday  =  0 ;
        for(var i in missions){
            if( $filter('customDateFilter')(missions[i].begin) < today && missions[i].assets.length){
                $scope.beforeToday++ ;
                console.log(missions[i]);
            }
            if( $filter('customDateFilter')(missions[i].begin) > today && missions[i].assets.length){
                $scope.afterToday++ ;
            }
        }
    }

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
                if(mission.assets.length){
                    Smartgeo.findAssetsByGuids($scope.site, mission.assets, function(assets){
                        if( assets.length === 0 ){
                            alertify.log("Les objets de cette missions n'ont pas été trouvés.");
                            return ;
                        }
                        mission.assetsCache         = assets ;
                        mission.pendingAssetsExtent = getExtentsFromAssetsList(assets);
                        mission.selectedAssets      = 0;
                        mission.extent = getExtentsFromAssetsList(mission.assetsCache);

                        $scope.highlightMission(mission);
                        $scope.$apply();
                        $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
                    });
                }
            } else {
                $scope.highlightMission(mission);
            }
        } else {
            $rootScope.$broadcast('UNHIGHLIGHT_ASSETS_FOR_MISSION', mission);
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

    $scope.showReport = function($index){
        var mission = $scope.missions[$index],
            selectedAssets = [];
        for (var i = 0; i < mission.assetsCache.length; i++) {
            if(mission.assetsCache[i].selected){
                selectedAssets.push(mission.assetsCache[i].id);
            }
        }
        $location.path('report/'+$rootScope.site.id+'/'+mission.activity.id+'/'+selectedAssets.join(',')+'/'+mission.id);
    };

    $scope.highlightMission = function(mission){
        $rootScope.$broadcast('HIGHLIGHT_ASSETS_FOR_MISSION', mission, null,
            /* marker click handler */
            function(mission, id){
                var asset = mission.assetsCache[id] ;
                asset.selected = !!!asset.selected ;
                mission.selectedAssets += asset.selected ? 1 : -1   ;
                $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_MISSION', asset);
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
        }
    };

    return Mission ;

});
