/**
 * @ngdoc object
 * @name planningController
 * @description
 * Planning controller
 */

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission, $location, $filter, G3ME, i18n){

    'use strict';

    /**
     * @ngdoc property
     * @name planningController#missions
     * @propertyOf planningController
     * @description List of missions, displayed on planning
     */
     $scope.missions = {} ;

    /**
     * @ngdoc property
     * @name planningController#_DAY_TO_MS
     * @propertyOf planningController
     * @const
     * @description Day to milliseconds : 86400000
     */
    $scope._DAY_TO_MS = 86400000 ;

    /**
     * @ngdoc property
     * @name planningController#_SYNCHRONIZE_INTERVAL
     * @propertyOf planningController
     * @const
     * @description
     */
    $scope._SYNCHRONIZE_INTERVAL = 60000;
    /**
     * @ngdoc property
     * @name planningController#dayToDisplay
     * @propertyOf planningController
     * @description Current displayed day on planning
     */
    $scope.dayToDisplay = 0;

    /**
     * @ngdoc property
     * @name planningController#beforeToday
     * @propertyOf planningController
     * @description Amount of mission before {@link planningController#dayToDisplay $scope.dayToDisplay}
     */
    $scope.beforeToday = 0 ;

    /**
     * @ngdoc property
     * @name planningController#afterToday
     * @propertyOf planningController
     * @description Amount of mission after {@link planningController#dayToDisplay $scope.dayToDisplay}
     */
    $scope.afterToday = 0 ;

    /**
     * @ngdoc property
     * @name planningController#assetsCache
     * @propertyOf planningController
     * @const
     * @description Assets cache for conversion id->asset
     */
     $scope.assetsCache = [] ;

    /**
     * @ngdoc property
     * @name planningController#doneAssetsCache
     * @propertyOf planningController
     * @const
     * @description Done assets cache for conversion id->asset
     */
     $scope.doneAssetsCache = [] ;

    /**
     * @ngdoc property
     * @name planningController#doneAssetsCache
     * @propertyOf planningController
     * @const
     * @description Done assets cache for conversion id->asset
     */
     $scope.lastUpdate = Smartgeo.get('lastUpdate');

    /**
     * @ngdoc method
     * @name planningController#today
     * @methodOf planningController
     * @description
     * Go to current day
     */
    $scope.today = function(){
        $scope.dayToDisplay = (new Date()).getTime();
        Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
    };

    /**
     * @ngdoc method
     * @name planningController#move
     * @methodOf planningController
     * @param {integer} delta Amount of day to move. Negative or positive number.
     * @description
     * Move to other day
     */
    $scope.move = function(delta){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay += delta*$scope._DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0 ){
            $scope.move(delta);
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        }
    };

    /**
     * @ngdoc method
     * @name planningController#synchronize
     * @methodOf planningController
     * @description
     * Get mission from remote server but keep 'openned', 'selectedAssets' and 'displayDone' attributes from local version
     */
    $scope.synchronize = function(){
        Mission
            .query()
            .success( function(data){

                var openedMission = [], previousMissionsId = [], displayDoneMission = [], selectedAssets = {},
                    i, currentId ;

                for (i in $scope.missions) {
                    previousMissionsId.push(1*i);
                    currentId = $scope.missions[i].id ;
                    if($scope.missions[i].openned){
                        openedMission.push(currentId);
                    }
                    if($scope.missions[i].displayDone){
                        displayDoneMission.push(currentId);
                    }
                    selectedAssets[currentId] = $scope.missions[i].selectedAssets ;
                }
                $scope.missions = data.results;
                for (i in $scope.missions) {
                    currentId = $scope.missions[i].id ;
                    if(previousMissionsId.indexOf(currentId) === -1){
                        alertify.log("Une nouvelle mission est arrivée !");
                        window.SmartgeoChromium && SmartgeoChromium.vibrate(10000);
                    }
                    if(openedMission.indexOf(currentId) >= 0){
                        $scope.toggleMission(i, false);
                        if(displayDoneMission.indexOf(currentId) >= 0){
                            $scope.showDoneAssets(i);
                        }
                    }
                    $scope.missions[i].selectedAssets = selectedAssets[currentId];
                }
                $scope.updateCount();
                $scope.removeDeprecatedTrace();
                $scope.lastUpdate = (new Date()).getTime();
            })
            .error( function(){
                if(Smartgeo.get('online')){
                    alertify.error(i18n.get('_PLANNING_SYNC_FAIL_'));
                }
                for (var i in $scope.missions) {
                    if($scope.missions[i].openned){
                        // Pour forcer l'ouverture (ugly) (le mieux serait d'avoir 2 methodes open/close)
                        $scope.missions[i].openned = false;
                        $scope.toggleMission(i, false);
                        if($scope.missions[i].displayDone){
                            $scope.showDoneAssets(i);
                        }
                    }
                }
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
    $rootScope.initializePlanning = $scope.initialize = function(){
        $scope.missions = Smartgeo.get('missions');
        Smartgeo.get_('reports', function(reports){
            $scope.removeObsoleteMission(reports);
            $scope.synchronize();
        });

        $scope.$watch('lastUpdate', function() {
            Smartgeo.set('lastUpdate', $scope.lastUpdate);
        });
        $scope.$watch('missions', function() {
            Smartgeo.set('missions', $scope.missions);
        });
        $scope.$watch('dayToDisplay', function() {
            $scope.updateCount();
        });
        $scope.dayToDisplay =  Smartgeo.get('lastUsedPlanningDate') || $scope.getMidnightTimestamp();
        setInterval($scope.synchronize,$scope._SYNCHRONIZE_INTERVAL);
    };

    /**
     * @ngdoc method
     * @name planningController#removeDeprecatedTrace
     * @methodOf planningController
     * @description
     * Remove trace from localStorage with no mission attached.
     */
     $scope.removeDeprecatedTrace = function(){
        var traces = Smartgeo.get('traces');
        for(var i in traces){
            if(!$scope.missions[i]){
                delete traces[i];
            }
        }
        Smartgeo.set('traces', traces);
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
        n -= (n.getMilliseconds()+n.getSeconds()*1000+n.getMinutes()*60000+n.getHours()*3600000);
        return (new Date(n).getTime());
     };

    /**
     * @ngdoc method
     * @name planningController#removeObsoleteMission
     * @methodOf planningController
     * @param {array} reports list of pending reports
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
     * <ul>
     *  <li>Format date to the right format, if it's comes from datepicker, it should be not weel formatted</li>
     *  <li>Process and update number in left and right arrows </li>
     * </ul>
     */
    $scope.updateCount = function(){
        $scope.dayToDisplay = (new Date($scope.dayToDisplay).getTime());
        $scope.beforeToday = $scope.afterToday = 0 ;
        for(var i in $scope.missions){
            var mission = $scope.missions[i], f = $filter('customDateFilter');
            if(!mission.assets.length){
                continue;
            }
            $scope.beforeToday += f(mission.begin) < ($scope.dayToDisplay - $scope._DAY_TO_MS) ? 1 : 0 ;
            $scope.afterToday  += f(mission.end  ) > ($scope.dayToDisplay + $scope._DAY_TO_MS) ? 1 : 0 ;
        }
    };

    /**
     * @ngdoc method
     * @name planningController#toggleMission
     * @methodOf planningController
     * @param {integer} $index index of concerned mission in $scope.missions attribute
     * @param {boolean} locate if true, set view to mission extent
     * @description
     * Opens mission in planning, fetch list of related assets in database, and put it in cache (if cache does not exist).
     * <p>Then :</p>
     * <ul>
     *  <li>if it's open : displays clusters on map by calling {@link planningController#highlightMission $scope.highlightMission}</li>
     *  <li>if it's not : displays clusters on map by sending {@link mapController#UNHIGHLIGHT_ASSETS_FOR_MISSION UNHIGHLIGHT\_ASSETS\_FOR\_MISSION} event to the {@link mapController mapController} </li>
     * </ul>
     */
    $scope.toggleMission = function($index, locate){

        var mission = $scope.missions[$index] ;
        mission.isLoading = true ;
        mission.openned = !mission.openned ;

        if(mission.openned && !$scope.assetsCache[mission.id] && mission.assets.length){
            return Smartgeo.findGeometryByGuids($scope.site, mission.assets, function(assets){
                if(!assets.length){
                    mission.isLoading = false ;
                    mission.objectNotFound = true;
                    $scope.$apply();
                    return ;
                }

                $scope.assetsCache[mission.id] = assets ;

                angular.extend(mission, {
                    selectedAssets : 0,
                    extent         : G3ME.getExtentsFromAssetsList($scope.assetsCache[mission.id]),
                    isLoading      : false
                });
                if($rootScope.site.activities._byId[mission.activity.id].type === "night_tour"){
                    mission.activity.isNightTour = true;
                    var traces = Smartgeo.get('traces') || [];
                    mission.trace = traces[mission.id];
                    $rootScope.$broadcast('__MAP_DISPLAY_TRACE__', mission);
                }
                $scope.highlightMission(mission);
                if(locate !== false){
                    $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
                }
                if(mission.displayDone){
                    $scope.showDoneAssets($index);
                }
                for(var i in $scope.assetsCache[mission.id]){
                    delete $scope.assetsCache[mission.id][i].xmin;
                    delete $scope.assetsCache[mission.id][i].xmax;
                    delete $scope.assetsCache[mission.id][i].ymin;
                    delete $scope.assetsCache[mission.id][i].ymax;
                    delete $scope.assetsCache[mission.id][i].geometry;
                }
                $scope.$apply();
            });

        } else if(mission.openned && $scope.assetsCache[mission.id] && mission.assets.length){
            $scope.highlightMission(mission);
            if(mission.displayDone){
                $scope.showDoneAssets($index);
            }
            if($rootScope.site.activities._byId[mission.activity.id].type === "night_tour"){
                $rootScope.$broadcast('__MAP_DISPLAY_TRACE__', mission);
            }
        } else if(!mission.openned){
            $rootScope.$broadcast('UNHIGHLIGHT_ASSETS_FOR_MISSION'     , mission);
            $rootScope.$broadcast('UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission);
            if($rootScope.site.activities._byId[mission.activity.id].type === "night_tour"){
                $rootScope.$broadcast('__MAP_HIDE_TRACE__', mission);
            }
        }

        mission.isLoading = false ;
    };

    /**
     * @ngdoc method
     * @name planningController#locateMission
     * @methodOf planningController
     * @param {integer} $index index of concerned mission in $scope.missions attribute
     * @description
     * Set map view to the mission's extent. If mission has no extent yet, it set it.
     */
    $scope.locateMission = function($index){
        var mission = $scope.missions[$index] ;
        if(!mission.extent){
            mission.extent = G3ME.getExtentsFromAssetsList($scope.assetsCache[mission.id]);
        }
        $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
    };

    /**
     * @ngdoc method
     * @name planningController#showReport
     * @methodOf planningController
     * @param {Object} mission concerned mission
     * @description Open report with concerned assets
     *
     */
    $scope.showReport = function(mission){
        var selectedAssets = [];
        for (var i = 0; i < $scope.assetsCache[mission.id].length; i++) {
            if($scope.assetsCache[mission.id][i].selected){
                selectedAssets.push($scope.assetsCache[mission.id][i].guid);
            }
        }
        console.log(selectedAssets);
        $location.path('report/'+$rootScope.site.id+'/'+mission.activity.id+'/'+selectedAssets.join(',')+'/'+mission.id);
    };

    /**
     * @ngdoc method
     * @name planningController#launchNightTour
     * @methodOf planningController
     * @param {Object} mission concerned mission
     * @description
     *
     */
     $scope.launchNightTour = function(mission){
        $rootScope.$broadcast('START_NIGHT_TOUR', mission, $scope.assetsCache[mission.id]) ;
     };


    /**
     * @ngdoc method
     * @name planningController#highlightMission
     * @methodOf planningController
     * @param {Object} mission concerned mission
     * @description
     * Send {@link mapController#HIGHLIGHT_ASSETS_FOR_MISSION HIGHLIGHT\_ASSETS\_FOR\_MISSION} event to
     * the {@link mapController mapController} with concerned mission and set a callback method on marker click
     * @function
     */
    $scope.highlightMission = function(mission){
        $rootScope.$broadcast('HIGHLIGHT_ASSETS_FOR_MISSION', mission, $scope.assetsCache[mission.id], null, $scope.markerClickHandler);
    };

    /**
     * @ngdoc method
     * @name planningController#markerClickHandler
     * @methodOf planningController
     * @param {integer} missionId Concerned mission identifier
     * @param {integer} assetId   Concerned asset identifier
     * @description This method is called when click event is performed on marker
     */
    $scope.markerClickHandler = function(missionId, assetId){
        var mission = $scope.missions[missionId],
            asset   = $scope.assetsCache[missionId][assetId],
            method  = $rootScope.site.activities._byId[mission.activity.id].type==="night_tour"?"NightTour":"Mission";
        $scope["toggleAssetsMarkerFor"+method](mission, asset) ;
    };

    /**
     * @ngdoc method
     * @name planningController#toggleAssetsMarkerForMission
     * @methodOf planningController
     * @param {object} mission Concerned mission
     * @param {object} asset   Concerned asset
     * @description This method is called when click event is performed on marker for mission
     */
    $scope.toggleAssetsMarkerForMission = function(mission, asset){
        asset.selected = !asset.selected ;
        mission.selectedAssets += asset.selected ? 1 : -1   ;
        $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_MISSION', asset);
        $scope.$apply();
    };

    /**
     * @ngdoc method
     * @name planningController#toggleAssetsMarkerForNightTour
     * @methodOf planningController
     * @param {object} mission Concerned mission
     * @param {object} asset   Concerned asset
     * @description This method is called when click event is performed on marker for night tour
     */
    $scope.toggleAssetsMarkerForNightTour = function(mission, asset){
        $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_NIGHT_TOUR', mission, asset);
    };

    /**
     * @ngdoc method
     * @name planningController#toggleDoneAssetsVisibility
     * @methodOf planningController
     * @param {integer} $index index of concerned mission in $scope.missions attribute
     * @description Toggle done assets visibility
     */
    $scope.toggleDoneAssetsVisibility = function($index){
        var mission = $scope.missions[$index] ;
        mission.displayDone = !!!mission.displayDone;
        $scope[ (mission.displayDone ? 'show' : 'hide') + 'DoneAssets']($index);
    };

    /**
     * @ngdoc method
     * @name planningController#showDoneAssets
     * @methodOf planningController
     * @param {integer} $index index of concerned mission in $scope.missions attribute
     * @description Show done assets
     */
    $scope.showDoneAssets = function($index){
        var mission = $scope.missions[$index] ;

        mission.isLoading = mission.displayDone = true ;

        if(!$scope.doneAssetsCache[mission.id]){
            return Smartgeo.findAssetsByGuids($scope.site, mission.done, function(assets){
                $scope.doneAssetsCache[mission.id] = assets ;
                $scope.showDoneAssets($index) ;
            });
        }

        $rootScope.$broadcast('HIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission, $scope.doneAssetsCache[mission.id]);

        mission.isLoading = false ;

        if(!$scope.$$phase) {
            $scope.$apply();
        }
    };

    /**
     * @ngdoc method
     * @name planningController#hideDoneAssets
     * @methodOf planningController
     * @param {integer} $index index of concerned mission in $scope.missions attribute
     * @description hide done assets
     */
    $scope.hideDoneAssets = function($index){
        var mission = $scope.missions[$index] ;
        mission.displayDone = false ;
        $rootScope.$broadcast('UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission);
    };

});
