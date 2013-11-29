/**
 * @ngdoc object
 * @name planningController
 * @description
 * Planning controller
 */

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission, $location, $filter, G3ME){

    'use strict';

    /**
     * @ngdoc property
     * @name planningController#DAY_TO_MS
     * @propertyOf planningController
     * @const
     * @description Day to milliseconds
     */
    $scope.DAY_TO_MS = 86400000 ;

    /**
     * @ngdoc method
     * @name planningController#remove1day
     * @methodOf planningController
     * @description
     * Go to preview day with mission(s)
     */
    $scope.remove1day = function(){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay -= $scope.DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0){
            $scope.remove1day();
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        }
    };

    /**
     * @ngdoc method
     * @name planningController#gototoday
     * @methodOf planningController
     * @description
     * Go to current day
     */
    $scope.gototoday = function(){
        $scope.dayToDisplay = (new Date()).getTime();
        Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
    };

    /**
     * @ngdoc method
     * @name planningController#add1day
     * @methodOf planningController
     * @description
     * Go to next day
     */
    $scope.add1day = function(){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay += $scope.DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0 ){
            $scope.add1day();
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        }
    };

    /**
     * @ngdoc method
     * @name planningController#synchronize
     * @methodOf planningController
     * @description
     * Get mission from remote server
     */
    $scope.synchronize = function(){
        Mission
            .query()
            .success( function(results){
                $scope.missions = results.results;
                $scope.updateCount();
                Smartgeo.set('missions', $scope.missions);
            })
            .error( function(){
                /* TODO : n'afficher le message que lorsque l'on est en ligne */
                alertify.error('Erreur lors de la mise à jour des missions');
            });
    };

    /**
     * @ngdoc method
     * @name planningController#initialize
     * @methodOf planningController
     * @description
     * Controller initialization :
     * <ul>
     *     <li>Get local mission(s)</li>
     *     <li>Reduce mission.assets array considering pending reports ({@link planningController#removeObsoleteMission $scope.removeObsoleteMission})</li>
     *     <li>Send pending missions related reports (TODO)</li>
     *     <li>Get remote mission(s) ({@link planningController#synchronize $scope.synchronize}) </li>
     *     <li>Set current day : today at midnight or last viewed day ({@link planningController#getMidnightTimestamp $scope.getMidnightTimestamp})</li>
     *     <li>Initialize counts ({@link planningController#updateCount $scope.updateCount}) </li>
     * </ul>
     */
    $scope.initialize = function(){
        $scope.missions = Smartgeo.get('missions');
        Smartgeo.get_('reports', function(reports){
            $scope.removeObsoleteMission(reports);
            $scope.synchronize();
            $scope.updateCount();
        });
        $scope.dayToDisplay =  Smartgeo.get('lastUsedPlanningDate') || $scope.getMidnightTimestamp();
    };

    /**
     * @ngdoc method
     * @name planningController#getMidnightTimestamp
     * @methodOf planningController
     * @description
     * @returns {Date} This morning midnight timestamp
     */
     $scope.getMidnightTimestamp = function(){
        var n = (new Date()) ;
        n -= (n.getMilliseconds()+n.getSeconds()*1000+n.getMinutes()*60000+n.getHours()*3600000).getTime();
        return new Date(n) ;
     };

    /**
     * @ngdoc method
     * @name planningController#removeObsoleteMission
     * @methodOf planningController
     * @description
     * Reduce mission.assets array considering pending reports
     */
    $scope.removeObsoleteMission = function(reports){
        var missions = Smartgeo.get('missions');
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
    };

    /**
     * @ngdoc method
     * @name planningController#updateCount
     * @methodOf planningController
     * @description
     * Update number in left and right arrows
     */
    $scope.updateCount = function(missions, today){
        $scope.beforeToday = $scope.afterToday = 0 ;
        for(var i in $scope.missions){
            var mission = $scope.missions[i], f = $filter('customDateFilter');
            if(!mission.assets.length){
                continue;
            }
            $scope.beforeToday += f(mission.begin) < ($scope.dayToDisplay - $scope.DAY_TO_MS) ? 1 : 0 ;
            $scope.afterToday  += f(mission.end  ) > ($scope.dayToDisplay + $scope.DAY_TO_MS) ? 1 : 0 ;
        }
    };

    $scope.openMission = function($index){
        var mission = $scope.missions[$index] ;
        mission.openned = !mission.openned ;
        Smartgeo.set('missions', $scope.missions);

        if(mission.openned || !mission.assetsCache|| !mission.extent){



            if(!mission.pendingAssetsExtent || !mission.assetsCache ){
                if(mission.assets.length){
                    Smartgeo.findAssetsByGuids($scope.site, mission.assets, function(assets){
                        if( assets.length === 0 ){
                            alertify.log("Les objets de cette missions n'ont pas été trouvés.");
                            return ;
                        }
                        mission.assetsCache         = assets ;
                        mission.pendingAssetsExtent = G3ME.getExtentsFromAssetsList(assets);
                        mission.selectedAssets      = 0;
                        mission.extent = G3ME.getExtentsFromAssetsList(mission.assetsCache);

                        $scope.highlightMission(mission);
                        $scope.$apply();
                        $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
                    });
                }
            } else {
                $scope.highlightMission(mission);
            }
        } else {
            G3ME.map.removeLayer($scope.fakeGeoJSONLayer);
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

    $scope.initialize() ;

});
