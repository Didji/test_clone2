/**
 * @class       planningController
 * @classdesc   Controlleur du planning
 *
 * @property {object} missions Liste de missions
 * @property {number} _DAY_TO_MS Nombre de millisecondes dans une journée
 * @property {number} _SYNCHRONIZE_INTERVAL Interval entre 2 synchronisations
 * @property {number} dayToDisplay Jour à afficher
 * @property {number} beforeToday Nombre de mission avant dayToDisplay
 * @property {number} afterToday Nombre de mission après dayToDisplay
 * @property {array} assetsCache Cache d'objets à réaliser
 * @property {array} doneAssetsCache Cache d'objets réalisés
 * @property {date} lastUpdate Date de dernière synchronisation
 */

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission, $location, $timeout, $filter, G3ME, i18n) {

    'use strict';

    /**
     * @method
     * @memberOf planningController
     * @desc
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
    $scope.initialize = function () {

        if(!Smartgeo.getRight('planning')){
            return ;
        }

        $rootScope.missions = {};
        $scope._DAY_TO_MS = 86400000;
        $scope._SYNCHRONIZE_INTERVAL = 60000;
        $scope.dayToDisplay = 0;
        $scope.beforeToday = 0;
        $scope.afterToday = 0;
        $scope.assetsCache = [];
        $rootScope.doneAssetsCache = [];
        $scope.lastUpdate = Smartgeo.get('lastUpdate');

        $rootScope.missions = Smartgeo.get('missions_'+Smartgeo.get('lastUser')) || {};

        // On décalle la synchro car des CR seront pas pris en compte (ceux qui viennent tout juste d'être enregistré)
        setTimeout(function() {
            Smartgeo.get_('reports', function (reports) {
                $scope.removeObsoleteMission(reports);
                $scope.synchronize();
            });
        }, 500);

        $scope.$watch('lastUpdate', function () {
            Smartgeo.set('lastUpdate', $scope.lastUpdate);
        });
        $scope.$watch('missions', function () {
            Smartgeo.set('missions_'+Smartgeo.get('lastUser'), $rootScope.missions || {});
        });
        $scope.$watch('dayToDisplay', function () {
            $scope.updateCount();
        });
        $scope.$on('SYNC_MISSION', function () {
            $scope.synchronize();
        });
        $scope.dayToDisplay = Smartgeo.get('lastUsedPlanningDate') || $scope.getMidnightTimestamp();

        Smartgeo.registerInterval("_SYNCHRONIZE_INTERVAL", function () {
            $scope.synchronize();
        }, $scope._SYNCHRONIZE_INTERVAL);
    };


    /**
     * @method
     * @memberOf planningController
     * @desc
     * Go to current day
     */
    $scope.today = function () {
        $scope.dayToDisplay = (new Date()).getTime();
        Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} delta Amount of day to move. Negative or positive number.
     * @desc
     * Move to other day
     */
    $scope.move = function (delta) {
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay += delta * $scope._DAY_TO_MS;
        if (Object.keys($filter('todaysMissions')($rootScope.missions, $scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($rootScope.missions, $scope.dayToDisplay)).length === 0) {
            $scope.move(delta);
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        }
    };

    /**
     * @method
     * @memberOf planningController
     * @desc
     * Get mission from remote server but keep 'openned', 'selectedAssets' and 'displayDone' attributes from local version
     */
    $scope.synchronize = function () {
        Mission.query()
            .success(function (data) {

                var open = [],
                    previous = [],
                    done = [],
                    selectedAssets = {},
                    i, postAddedAssetsMission = {}, newMissionCount = 0,
                    mission, missionsExtents = {};

                for (i in $rootScope.missions) {
                    i *= 1;
                    previous.push(i);
                    mission = $rootScope.missions[i];
                    if (mission.openned) {
                        open.push(i);
                    }
                    if (mission.displayDone && mission.assets.length) {
                        done.push(i);
                    }
                    selectedAssets[i] = mission.selectedAssets;
                    postAddedAssetsMission[i] = mission.postAddedAssets;
                    missionsExtents[i] = mission.extent;
                }

                $rootScope.missions = data.results;
                for (i in $rootScope.missions) {
                    i *= 1;
                    mission = $rootScope.missions[i];
                    if (postAddedAssetsMission[i]) {
                        mission.postAddedAssets = postAddedAssetsMission[i];
                        // TODO: à tester avec la fonctionnalité côté serveur.
                        for (var j = 0, length = mission.postAddedAssets.assets.length; j < length; j++) {
                            if (mission.done.indexOf(1*mission.postAddedAssets.assets[j]) !== -1) {
                                mission.postAddedAssets.done.push(mission.postAddedAssets.assets[j]);
                                mission.postAddedAssets.assets.splice(j--, 1);
                                length--;
                            }
                        }
                        mission.assets = mission.assets.concat(mission.postAddedAssets.assets);
                        mission.done = mission.done.concat(mission.postAddedAssets.done);
                    }

                    newMissionCount += (mission.assets.length && previous.indexOf(i) === -1) ? 1 : 0;

                    if (open.indexOf(i) >= 0) {
                        mission.openned = false;
                        $scope.toggleMission(i, false);
                        if (done.indexOf(i) >= 0) {
                            mission.displayDone = false;
                            $scope.showDoneAssets(i);
                        }
                    }
                    mission.extent = missionsExtents[i];
                    mission.selectedAssets = selectedAssets[i];
                }
                if (newMissionCount > 0) {
                    var text;
                    if (newMissionCount === 1) {
                        text = newMissionCount + i18n.get('_PLANNING_NEW_MISSION_');
                    } else {
                        text = newMissionCount + i18n.get('_PLANNING_NEW_MISSIONS_');
                    }
                    alertify.log(text);
                    if (window.SmartgeoChromium) {
                        SmartgeoChromium.vibrate(500);
                    }
                }
                $scope.updateCount();
                $scope.removeDeprecatedTraces();
                $scope.removeDeprecatedMarkers();
                $scope.lastUpdate = (new Date()).getTime();
            })
            .error(function (message, code) {
                if (Smartgeo.get('online') && message !== "" && code !== 0) {
                    alertify.error(i18n.get('_PLANNING_SYNC_FAIL_'));
                }
                for (var i in $rootScope.missions) {
                    var mission = $rootScope.missions[i];
                    if (mission.openned && mission.assets.length) {
                        // Pour forcer l'ouverture (ugly) (le mieux serait d'avoir 2 methodes open/close)
                        mission.openned = false;
                        $scope.toggleMission(i, false);
                        if (mission.displayDone) {
                            mission.displayDone = false;
                            $scope.showDoneAssets(i);
                        }
                    }
                }
            });
    };


    /**
     * @method
     * @memberOf planningController
     * @desc
     *
     */
    $scope.poll = function () {
        if ($rootScope.STOP_POLLING === true) {
            return;
        }
        Mission.poll()
            .success(function (data) {
                try {
                    JSON.parse(data);
                    $scope.synchronize();
                    $scope.poll();
                } catch (itsnotajson) {
                    $timeout($scope.poll, 5000);
                }
            }).error(function (data, status) {
                if(status === 403){
                    Smartgeo.silentLogin();
                }
                $timeout($scope.poll, 5000);
            });
    };

    /**
     * @method
     * @memberOf planningController
     * @desc
     * Remove trace from localStorage with no mission attached.
     */
    $scope.removeDeprecatedTraces = function () {
        var traces = Smartgeo.get('traces'), updated = false;
        for (var i in traces) {
            if (!$rootScope.missions[i]) {
                updated = true;
                delete traces[i];
            }
        }
        if(updated){
            Smartgeo.set('traces', traces);
        }
    };

    /**
     * @method
     * @memberOf planningController
     * @desc
     *
     */
    $scope.removeDeprecatedMarkers = function () {
        $rootScope.$broadcast('UNHIGHLIGHT_DEPRECATED_MARKERS', $rootScope.missions);
    };


    /**
     * @method
     * @memberOf planningController
     * @desc
     * @returns {Date} This morning midnight timestamp
     */
    $scope.getMidnightTimestamp = function () {
        var n = (new Date());
        n -= (n.getMilliseconds() + n.getSeconds() * 1000 + n.getMinutes() * 60000 + n.getHours() * 3600000);
        return (new Date(n).getTime());
    };

    /**
     * @method
     * @memberOf planningController
     * @param {array} reports list of pending reports
     * @desc
     * Reduce mission.assets array considering pending reports
     */
    $scope.removeObsoleteMission = function (reports) {
        var missions = Smartgeo.get('missions_'+Smartgeo.get('lastUser')),
            index, pendingAssets, mission, i;
        for (i in reports) {
            if (missions[reports[i].mission]) {
                pendingAssets = reports[i].assets;
                mission = missions[reports[i].mission];
                for (var j = 0, length = mission.assets.length; j < length; j++) {
                    if (pendingAssets.indexOf(1 * mission.assets[j]) === -1) {
                        continue;
                    }
                    mission.done.push(mission.assets[j]);
                    mission.assets.splice(j--, 1);
                    length--;
                }
                if (!mission.postAddedAssets) {
                    continue;
                }
                for (j = 0; j < mission.postAddedAssets.assets.length; j++) {
                    index = pendingAssets.indexOf(mission.postAddedAssets.assets[j]);
                    if (index === -1) {
                        continue;
                    }
                    mission.postAddedAssets.done.push(mission.postAddedAssets.assets[j]);
                    mission.done.push(mission.postAddedAssets.assets[j]);
                    mission.postAddedAssets.assets.splice(index, 1);
                }
            }
        }
        $rootScope.missions = missions;
    };

    /**
     * @method
     * @memberOf planningController
     * @desc
     * <ul>
     *  <li>Format date to the right format, if it's comes from datepicker, it should be not weel formatted</li>
     *  <li>Process and update number in left and right arrows </li>
     * </ul>
     */
    $scope.updateCount = function () {
        $scope.dayToDisplay = (new Date($scope.dayToDisplay).getTime());
        $scope.beforeToday = $scope.afterToday = 0;
        for (var i in $rootScope.missions) {
            var mission = $rootScope.missions[i],
                f = $filter('customDateFilter');
            if (!mission.assets.length) {
                continue;
            }
            $scope.beforeToday += f(mission.begin) < ($scope.dayToDisplay - $scope._DAY_TO_MS) ? 1 : 0;
            $scope.afterToday += f(mission.end) > ($scope.dayToDisplay + $scope._DAY_TO_MS) ? 1 : 0;
        }
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} $index index of concerned mission in $rootScope.missions attribute
     * @param {boolean} locate if true, set view to mission extent
     * @desc
     * Opens mission in planning, fetch list of related assets in database, and put it in cache (if cache does not exist).
     * <p>Then :</p>
     * <ul>
     *  <li>if it's open : displays clusters on map by calling {@link planningController#highlightMission $scope.highlightMission}</li>
     *  <li>if it's not : displays clusters on map by sending {@link mapController#UNHIGHLIGHT_ASSETS_FOR_MISSION UNHIGHLIGHT\_ASSETS\_FOR\_MISSION} event to the {@link mapController mapController} </li>
     * </ul>
     */
    $scope.toggleMission = function ($index, locate) {
        var mission = $rootScope.missions[$index];
        mission.isLoading = true;
        mission.openned = !mission.openned;

        if (mission.openned && !$scope.assetsCache[mission.id] && mission.assets.length) {
            return Smartgeo.findGeometryByGuids($scope.site, mission.assets, function (assets) {
                if (!assets.length) {
                    mission.isLoading = false;
                    mission.objectNotFound = true;
                    $scope.$apply();
                    return;
                }

                $scope.assetsCache[mission.id] = assets;
                $scope.assetsCache[mission.id]._byId = {};
                for (var i = 0; i < $scope.assetsCache[mission.id].length; i++) {
                    $scope.assetsCache[mission.id]._byId[$scope.assetsCache[mission.id][i].guid] = $scope.assetsCache[mission.id][i];
                }
                angular.extend(mission, {
                    selectedAssets: 0,
                    extent: G3ME.getExtentsFromAssetsList($scope.assetsCache[mission.id]),
                    isLoading: false
                });
                if (mission.activity && $rootScope.site.activities._byId[mission.activity.id].type === "night_tour") {
                    mission.activity.isNightTour = true;
                    var traces = Smartgeo.get('traces') || [];
                    mission.trace = traces[mission.id];
                    $rootScope.$broadcast('__MAP_DISPLAY_TRACE__', mission);
                }
                $scope.highlightMission(mission);
                if (locate !== false) {
                    $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
                }
                if (mission.displayDone) {
                    $scope.showDoneAssets($index);
                }
                for (i in $scope.assetsCache[mission.id]) {
                    delete $scope.assetsCache[mission.id][i].xmin;
                    delete $scope.assetsCache[mission.id][i].xmax;
                    delete $scope.assetsCache[mission.id][i].ymin;
                    delete $scope.assetsCache[mission.id][i].ymax;
                    delete $scope.assetsCache[mission.id][i].geometry;
                }
                $scope.$apply();
            });

        } else if (mission.openned && $scope.assetsCache[mission.id] && mission.assets.length) {
            $scope.highlightMission(mission);
            if (mission.displayDone) {
                $scope.showDoneAssets($index);
            }
            if (mission.activity && $rootScope.site.activities._byId[mission.activity.id].type === "night_tour") {
                $rootScope.$broadcast('__MAP_DISPLAY_TRACE__', mission);
            }
        } else if (!mission.openned) {
            $rootScope.$broadcast('UNHIGHLIGHT_ASSETS_FOR_MISSION', mission);
            $rootScope.$broadcast('UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission);
            if (mission.activity && $rootScope.site.activities._byId[mission.activity.id].type === "night_tour") {
                $rootScope.$broadcast('__MAP_HIDE_TRACE__', mission);
            }
        }

        mission.isLoading = false;
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} $index index of concerned mission in $rootScope.missions attribute
     * @desc
     * Set map view to the mission's extent. If mission has no extent yet, it set it.
     */
    $scope.locateMission = function ($index) {
        var mission = $rootScope.missions[$index];
        if (!mission.extent) {
            mission.extent = G3ME.getExtentsFromAssetsList($scope.assetsCache[mission.id]);
        }
        $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {Object} mission concerned mission
     * @desc Open report with concerned assets
     *
     */
    $scope.showReport = function (mission) {
        var selectedAssets = [];
        for (var i = 0; i < $scope.assetsCache[mission.id].length; i++) {
            if ($scope.assetsCache[mission.id][i].selected) {
                selectedAssets.push($scope.assetsCache[mission.id][i].guid);
            }
        }
        if (mission.activity) {
            $location.path('report/' + $rootScope.site.id + '/' + mission.activity.id + '/' + selectedAssets.join(',') + '/' + mission.id);
        } else {
            $location.path('report/' + $rootScope.site.id + '//' + selectedAssets.join(',') + '/' + mission.id);
        }
    };

    /**
     * @method
     * @memberOf planningController
     * @param {Object} mission concerned mission
     * @desc
     *
     */
    $scope.launchNightTour = function (mission) {
        $rootScope.$broadcast('START_NIGHT_TOUR', mission, $scope.assetsCache[mission.id]);
    };


    /**
     * @method
     * @memberOf planningController
     * @param {Object} mission concerned mission
     * @desc
     * Send {@link mapController#HIGHLIGHT_ASSETS_FOR_MISSION HIGHLIGHT\_ASSETS\_FOR\_MISSION} event to
     * the {@link mapController mapController} with concerned mission and set a callback method on marker click
     * @function
     */
    $scope.highlightMission = function (mission) {
        $rootScope.$broadcast('HIGHLIGHT_ASSETS_FOR_MISSION', mission, $scope.assetsCache[mission.id], null, $scope.markerClickHandler);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} missionId Concerned mission identifier
     * @param {integer} assetId   Concerned asset identifier
     * @desc This method is called when click event is performed on marker
     */
    $scope.markerClickHandler = function (missionId, assetId) {
        var mission = $rootScope.missions[missionId],
            asset = $scope.assetsCache[missionId][assetId],
            method = (mission.activity && $rootScope.site.activities._byId[mission.activity.id].type === "night_tour") ? "NightTour" : "Mission";
        $scope["toggleAssetsMarkerFor" + method](mission, asset);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {object} mission Concerned mission
     * @param {object} asset   Concerned asset
     * @desc This method is called when click event is performed on marker for mission
     */
    $scope.toggleAssetsMarkerForMission = function (mission, asset) {
        asset.selected = !asset.selected;
        if(!mission.selectedAssets){
            mission.selectedAssets = 0 ;
        }
        mission.selectedAssets += asset.selected ? 1 : -1;
        $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_MISSION', asset);
        $scope.$apply();
    };

    /**
     * @method
     * @memberOf planningController
     * @param {object} mission Concerned mission
     * @param {object} asset   Concerned asset
     * @desc This method is called when click event is performed on marker for night tour
     */
    $scope.toggleAssetsMarkerForNightTour = function (mission, asset) {
        $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_NIGHT_TOUR', mission, asset);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} $index index of concerned mission in $rootScope.missions attribute
     * @desc Toggle done assets visibility
     */
    $scope.toggleDoneAssetsVisibility = function ($index) {
        var mission = $rootScope.missions[$index];
        mission.displayDone = !! !mission.displayDone;
        $scope[(mission.displayDone ? 'show' : 'hide') + 'DoneAssets']($index);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} $index index of concerned mission in $rootScope.missions attribute
     * @desc Show done assets
     */
    $scope.showDoneAssets = function ($index) {
        var mission = $rootScope.missions[$index];
        mission.isLoading = mission.displayDone = true;

        if ((!$rootScope.doneAssetsCache[mission.id] || ($rootScope.doneAssetsCache[mission.id].length < mission.done.length && mission.activity)) && !$scope.stopCacheLoop) {
            $scope.stopCacheLoop = true ;
            return Smartgeo.findAssetsByGuids($scope.site, mission.done, function (assets) {
                if(!$rootScope.doneAssetsCache[mission.id] || !$rootScope.doneAssetsCache[mission.id].length){
                    $rootScope.doneAssetsCache[mission.id] = assets;
                } else {
                    for (var i = 0; i < assets.length; i++) {
                        var toBeAdded = true ;
                        for (var j = 0; j < $rootScope.doneAssetsCache[mission.id].length; j++) {
                            if($rootScope.doneAssetsCache[mission.id][j].id === assets[i].id){
                                toBeAdded = false ;
                                break;
                            }
                        }
                        if(toBeAdded){
                            $rootScope.doneAssetsCache[mission.id].push(assets[i]);
                        }
                    }
                }
                $scope.showDoneAssets($index);
            });
        }

        if($scope.stopCacheLoop){
            delete $scope.stopCacheLoop ;
        }

        $rootScope.$broadcast('HIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission, $rootScope.doneAssetsCache[mission.id]);

        mission.isLoading = false;

        if (!$scope.$$phase) {
            $scope.$apply();
        }
    };

    /**
     * @method
     * @memberOf planningController
     * @param {integer} $index index of concerned mission in $rootScope.missions attribute
     * @desc hide done assets
     */
    $scope.hideDoneAssets = function ($index) {
        var mission = $rootScope.missions[$index];
        mission.displayDone = false;
        $rootScope.$broadcast('UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission);
    };


    /**
     * @method
     * @memberOf planningController
     * @param {Object} asset
     * @param {Object} mission
     * @desc
     */
    $rootScope.addAssetToMission = $scope.addAssetToMission = function (asset, mission) {

        if (mission.assets.indexOf(asset.guid) !== -1 || mission.done.indexOf(asset.guid) !== -1) {
            return;
        }

        mission.isLoading = true;

        mission.assets.push(asset.guid);

        if (!mission.postAddedAssets) {
            mission.postAddedAssets = {
                done: [],
                assets: [asset.guid]
            };
        } else {
            mission.postAddedAssets.assets.push(asset.guid);
        }

        Smartgeo.set('missions_'+Smartgeo.get('lastUser'), $rootScope.missions);

        Smartgeo.findGeometryByGuids($scope.site, asset.guid, function (assets) {

            if (!$scope.assetsCache[mission.id]) {
                $scope.assetsCache[mission.id] = [];
            }
            if (!$scope.assetsCache[mission.id]._byId) {
                $scope.assetsCache[mission.id]._byId = {};
            }

            $scope.assetsCache[mission.id].push(assets[0]);
            $scope.assetsCache[mission.id]._byId[assets[0].guid] = assets[0];

            $scope.highlightMission(mission);

            delete assets[0].xmin;
            delete assets[0].xmax;
            delete assets[0].ymin;
            delete assets[0].ymax;

            mission.isLoading = false;
            $scope.$apply();
        });

    };

    /**
     * @method
     * @memberOf planningController
     * @param {Object} asset
     * @param {Object} mission
     * @desc
     */
    $scope.removeAssetFromMission = function (asset, mission) {
        mission.assets.splice(mission.assets.indexOf(asset.guid), 1);
        mission.postAddedAssets.assets.splice(mission.postAddedAssets.assets.indexOf(asset.guid), 1);
        Smartgeo.set('missions_'+Smartgeo.get('lastUser'), $rootScope.missions);
        $scope.highlightMission(mission);
    };

    /**
     * @method
     * @memberOf planningController
     * @param {Object} asset
     * @desc
     */
    $scope.locateAsset = function (asset) {
        Smartgeo.findAssetsByGuids($scope.site, asset.guid, function (assets) {
            $rootScope.$broadcast("ZOOM_ON_ASSET", assets[0]);
        });
    };

    /**
     * @method
     * @memberOf planningController
     * @param {Event} event
     * @desc
     */
    $scope.activateConsultation = function (event) {
        $rootScope.$broadcast("ACTIVATE_CONSULTATION");
        return false;
    };

});
