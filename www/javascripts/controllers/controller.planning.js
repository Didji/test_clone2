(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'PlanningController', PlanningController );

    PlanningController.$inject = ["$scope", "$rootScope", "Mission", "$location", "$timeout", "$filter", "G3ME", "i18n", "Storage", "$interval", "Site", "Asset", "Synchronizator"];

    /**
     * @class PlanningController
     * @desc Controlleur du planning
     */
    function PlanningController($scope, $rootScope, Mission, $location, $timeout, $filter, G3ME, i18n, Storage, $interval, Site, Asset, Synchronizator) {

        var vm = this ;

        vm.findNextMissions = findNextMissions;
        vm.synchronize = synchronize;
        vm.locateMission = locateMission;
        vm.showReport = showReport;
        vm.launchNightTour = launchNightTour;
        vm.toggleAssetsMarkerForMission = toggleAssetsMarkerForMission;
        vm.toggleAssetsMarkerForNightTour = toggleAssetsMarkerForNightTour;
        vm.toggleDoneAssetsVisibility = toggleDoneAssetsVisibility;
        vm.hideDoneAssets = hideDoneAssets;
        vm.showDoneAssets = showDoneAssets;
        vm.locateAsset = locateAsset;
        vm.removeAssetFromMission = removeAssetFromMission;
        vm.getAssetLabel = getAssetLabel;
        vm.toggleMission = toggleMission;

        vm.lastUpdate = Storage.get( 'lastUpdate' );
        vm.lateMissionsLength = 0;
        vm.todayMissionsLength = 0;
        vm.doneMissionsLength = 0;
        $rootScope.missions = Storage.get( 'missions_' + Storage.get( 'lastUser' ) ) || {};
        vm.currentNextDay = getMidnightTimestamp( (new Date()).getTime() );
        vm.maxBeginDate = 0 ;
        vm.nextMissions = {};
        vm.doneAssetsCache = {};
        vm.activities = Site.current.activities;

        var assetsCache = {};
        var notFirst = {};
        var _SYNCHRONIZE_INTERVAL = 60000;
        var _SYNCHRONIZE_INTERVAL_ID ;
        var stopCacheLoop = false;

        activate();

        function activate() {
            applyFilterOnMission();

            // On décalle la synchro car des CR seront pas pris en compte (ceux qui viennent tout juste d'être enregistré)
            $timeout( function() {
                Synchronizator.getAllByType( 'Report', function(reports) {
                    removeObsoleteMission( reports );
                    vm.synchronize();
                } );
            }, 1000 );

            $scope.$on( 'SYNC_MISSION', function() {
                vm.synchronize();
            } );

            _SYNCHRONIZE_INTERVAL_ID = $interval( function() {
                vm.synchronize();
            }, _SYNCHRONIZE_INTERVAL );

            $scope.$on( "$destroy", function() {
                $interval.cancel( _SYNCHRONIZE_INTERVAL_ID );
            } );

        }

        /**
         * @name findNextMissions
         * @desc
         */
        function findNextMissions() {
            if (vm.currentNextDay > vm.maxBeginDate) {
                setTimeout( function() {
                    vm.currentNextDay -= 86400000 ;
                }, 2000 );
                return;
            }

            var nextDayMission = $filter( 'specificDayMissions' )( vm.missions, vm.currentNextDay += 86400000 );

            if (!nextDayMission.length) {
                return vm.findNextMissions();
            }

            vm.nextMissions[vm.currentNextDay] = nextDayMission;
        }


        /**
         * @name synchronize
         * @desc Get mission from remote server but keep 'openned', 'selectedAssets' and 'displayDone' attributes from local version
         */
        function synchronize() {
            Mission.query()
                .then( function(data) {
                    if (!data || !data.results) {
                        return synchronizeErrorCallback( "", 0 );
                    }
                    var open = [],
                        previous = [],
                        done = [],
                        selectedAssets = {},
                        i,
                        postAddedAssetsMission = {},
                        newMissionCount = 0,
                        mission,
                        missionsExtents = {};

                    for (i in vm.missions) {
                        i *= 1;
                        previous.push( i );
                        mission = vm.missions[i];
                        if (mission.openned) {
                            open.push( i );
                        }
                        if (mission.displayDone && (mission.assets.length || !mission.activity)) {
                            done.push( i );
                        }
                        selectedAssets[i] = mission.selectedAssets;
                        postAddedAssetsMission[i] = mission.postAddedAssets;
                        missionsExtents[i] = mission.extent;
                    }

                    vm.missions = data.results;
                    $rootScope.missions = vm.missions;
                    Storage.set( 'missions_' + Storage.get( 'lastUser' ), vm.missions || {} );
                    vm.maxBeginDate = 0;
                    for (i in vm.missions) {
                        i *= 1;
                        mission = vm.missions[i];
                        vm.maxBeginDate = Math.max( vm.maxBeginDate, $filter( 'sanitizeDate' )( mission.begin ) );
                        if (postAddedAssetsMission[i]) {
                            mission.postAddedAssets = postAddedAssetsMission[i];
                            for (var j = 0, length = mission.postAddedAssets.assets.length; j < length; j++) {
                                if (mission.done.indexOf( 1 * mission.postAddedAssets.assets[j] ) !== -1) {
                                    mission.postAddedAssets.done.push( mission.postAddedAssets.assets[j] );
                                    mission.postAddedAssets.assets.splice( j--, 1 );
                                    length--;
                                }
                            }
                            mission.assets = mission.assets.concat( mission.postAddedAssets.assets );
                        }

                        newMissionCount += (((mission.assets.length || !mission.activity)) && previous.indexOf( i ) === -1) ? 1 : 0;

                        if (open.indexOf( i ) >= 0) {
                            mission.openned = false;
                            vm.toggleMission( mission, false );
                            if (done.indexOf( i ) >= 0) {
                                mission.displayDone = false;
                                vm.showDoneAssets( mission );
                            }
                        }
                        mission.extent = missionsExtents[i];
                        mission.selectedAssets = selectedAssets[i];
                    }
                    if (newMissionCount > 0) {
                        var text;
                        if (newMissionCount === 1) {
                            text = newMissionCount + i18n.get( '_PLANNING_NEW_MISSION_' );
                        } else {
                            text = newMissionCount + i18n.get( '_PLANNING_NEW_MISSIONS_' );
                        }
                        alertify.log( text );
                        if(navigator.vibrate) {
                            navigator.vibrate( 500 );
                        }
                    }
                    removeDeprecatedTraces();
                    removeDeprecatedMarkers();

                    vm.lastUpdate = (new Date()).getTime();
                    Storage.set( 'lastUpdate', vm.lastUpdate );

                    var tmp = {};

                    for (var day in vm.nextMissions) {
                        var sday = vm.nextMissions[day] ;
                        for (i = 0; i < sday.length; i++) {
                            mission = sday[i];
                            if (vm.missions[mission.id]) {
                                tmp[day] = tmp[day] || [];
                                tmp[day].push( mission );
                            }
                        }
                    }
                    vm.nextMissions = tmp;
                    applyFilterOnMission();
                    fillAssetsCache();
                },
                function(message, code) {
                    synchronizeErrorCallback( message, code );
                } );
        }

        /**
         * @name synchronizeErrorCallback
         * @desc
         */
        function synchronizeErrorCallback(message, code) {
            if (Storage.get( 'online' ) && message !== "" && code !== 0) {
                alertify.error( i18n.get( '_PLANNING_SYNC_FAIL_' ) );
            }
            vm.maxBeginDate = 0;
            for (var i in vm.missions) {
                var mission = vm.missions[i];
                if (!notFirst[mission.id]) {
                    mission.selectedAssets = 0;
                    notFirst[mission.id] = true;
                }
                vm.maxBeginDate = Math.max( vm.maxBeginDate, $filter( 'sanitizeDate' )( mission.begin ) );
                if (mission.openned && (mission.assets.length || !mission.activity)) {
                    // Pour forcer l'ouverture (ugly) (le mieux serait d'avoir 2 methodes open/close)
                    mission.openned = false;
                    vm.toggleMission( mission, false );
                    if (mission.displayDone) {
                        mission.displayDone = false;
                        vm.showDoneAssets( mission );
                    }
                }
            }
            applyFilterOnMission();
            fillAssetsCache();
        }

        /**
         * @name applyFilterOnMission
         * @desc
         */
        function applyFilterOnMission() {
            vm.lateMissionsLength = Object.keys( $filter( 'lateMissions' )( vm.missions ) || {} ).length;
            vm.todayMissionsLength = Object.keys( $filter( 'todayMissions' )( vm.missions ) || {} ).length;
            vm.doneMissionsLength = Object.keys( $filter( 'doneMissions' )( vm.missions ) || {} ).length;
        }

        /**
         * @name removeDeprecatedTraces
         * @desc Remove trace from localStorage with no mission attached.
         */
        function removeDeprecatedTraces() {
            var traces = Storage.get( 'traces' ),
                updated = false;
            for (var i in traces) {
                if (!vm.missions[i]) {
                    updated = true;
                    delete traces[i];
                }
            }
            if (updated) {
                Storage.set( 'traces', traces );
            }
        }

        /**
         * @name removeDeprecatedMarkers
         * @desc
         *
         */
        function removeDeprecatedMarkers() {
            $rootScope.$broadcast( 'UNHIGHLIGHT_DEPRECATED_MARKERS', vm.missions );
        }

        /**
         * @name fillAssetsCache
         * @desc
         *
         */
        function fillAssetsCache() {
            for (var i in vm.missions) {
                if (vm.missions[i].postAddedAssets && vm.missions[i].postAddedAssets.assets && vm.missions[i].postAddedAssets.assets.length) {
                    (function(mission) {
                        Asset.findGeometryByGuids( mission.postAddedAssets.assets, function(assets) {
                            if (!assetsCache[mission.id]) {
                                assetsCache[mission.id] = [];
                            }
                            if (!assetsCache[mission.id]._byId) {
                                assetsCache[mission.id]._byId = {};
                            }

                            for (var i = 0, assetsLength = assets.length; i < assetsLength; i++) {
                                if (!assetsCache[mission.id]._byId[1 * assets[i].guid]) {
                                    assetsCache[mission.id].push( assets[i] );
                                    assetsCache[mission.id]._byId[1 * assets[i].guid] = assets[i];
                                }
                            }

                            $scope.$apply();
                        } );
                    })( vm.missions[i] );
                }

                if (vm.missions[i].postAddedAssets && vm.missions[i].postAddedAssets.done && vm.missions[i].postAddedAssets.done.length) {
                    (function(mission) {

                        Asset.findGeometryByGuids( mission.postAddedAssets.done, function(assets) {

                            if (!vm.doneAssetsCache[mission.id]) {
                                vm.doneAssetsCache[mission.id] = [];
                            }

                            if (!vm.doneAssetsCache[mission.id]._byId) {
                                vm.doneAssetsCache[mission.id]._byId = {};
                            }

                            for (var i = 0, assetsLength = assets.length; i < assetsLength; i++) {
                                if (!vm.doneAssetsCache[mission.id]._byId[1 * assets[i].guid]) {
                                    vm.doneAssetsCache[mission.id].push( assets[i] );
                                    vm.doneAssetsCache[mission.id]._byId[1 * assets[i].guid] = assets[i];
                                }
                            }

                            $scope.$apply();
                        } );
                    })( vm.missions[i] );
                }
            }
        }


        /**
         * @name getMidnightTimestamp
         * @desc
         * @returns {Date} This morning midnight timestamp
         */
        function getMidnightTimestamp(n) {
            n = (new Date( n )) || (new Date());
            n -= (n.getMilliseconds() + n.getSeconds() * 1000 + n.getMinutes() * 60000 + n.getHours() * 3600000);
            return (new Date( n ).getTime());
        }

        /**
         * @name removeObsoleteMission
         * @param {array} reports list of pending reports
         * @desc Reduce mission.assets array considering pending reports
         */
        function removeObsoleteMission(reports) {
            var missions = Storage.get( 'missions_' + Storage.get( 'lastUser' ) ),
                index, pendingAssets, mission, i;
            for (i in reports) {
                if (missions[reports[i].mission]) {
                    pendingAssets = reports[i].assets;
                    mission = missions[reports[i].mission];
                    for (var j = 0, length_ = mission.assets.length; j < length_; j++) {
                        if (pendingAssets.indexOf( 1 * mission.assets[j] ) === -1 && pendingAssets.indexOf( "" + mission.assets[j] ) === -1) {
                            continue;
                        }
                        mission.done.push( mission.assets[j] );
                        mission.assets.splice( j--, 1 );
                        length_--;
                    }
                    var tempassets = angular.copy( mission.postAddedAssets && mission.postAddedAssets.assets || [] );
                    for (var k = 0, length_2 = tempassets.length; k < length_2; k++) {
                        index = pendingAssets.indexOf( "" + tempassets[k] );
                        if (index === -1) {
                            continue;
                        }
                        mission.postAddedAssets.done.push( tempassets[k] );
                        mission.postAddedAssets.assets.splice( mission.postAddedAssets.assets.indexOf( tempassets[k] ), 1 );
                    }
                }
            }
            vm.missions = missions;
            Storage.set( 'missions_' + Storage.get( 'lastUser' ), vm.missions || {} );
        }

        /**
         * @name toggleMission
         * @param {integer} $index index of concerned mission in vm.missions attribute
         * @param {boolean} locate if true, set view to mission extent
         * @desc
         */
        function toggleMission(mission, locate) {
            mission = vm.missions[mission.id];
            mission.isLoading = true;
            mission.openned = !mission.openned;

            if (mission.opened) {
                $rootScope.$broadcast( "DESACTIVATE_POSITION" );
            }
            if (mission.openned && (!assetsCache[mission.id] || assetsCache[mission.id].length < mission.assets.length) && (mission.assets.length || !mission.activity)) {
                return Asset.findGeometryByGuids( mission.assets, function(assets) {
                    if (!assets.length) {
                        mission.isLoading = false;
                        mission.objectNotFound = true;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                        $rootScope.missions[mission.id] = mission;
                        Storage.set('missions_' + Storage.get('lastUser'), $rootScope.missions || {});
                        return;
                    } else {
                        if(typeof mission.objectNotFound != "undefined") {
                            delete mission.objectNotFound;
                        }
                    }
                    var i, assetsLength;
                    assetsCache[mission.id] = assetsCache[mission.id] || [];

                    for (i = 0, assetsLength = assets.length; i < assetsLength; i++) {
                        if (!assetsCache[mission.id]._byId || !assetsCache[mission.id]._byId[assets[i].guid]) {
                            assetsCache[mission.id].push( assets[i] );
                        }
                    }
                    assetsCache[mission.id]._byId = {};
                    for (i = 0, assetsLength = assetsCache[mission.id].length; i < assetsLength; i++) {
                        assetsCache[mission.id]._byId[assetsCache[mission.id][i].guid] = assetsCache[mission.id][i];
                    }

                    var traces = Storage.get( 'traces' ) || [];
                    mission.trace = traces[mission.id];
                    $rootScope.$broadcast( '__MAP_DISPLAY_TRACE__', mission );

                    angular.extend( mission, {
                        selectedAssets: 0,
                        extent: G3ME.getExtentsFromAssetsList( assets ),
                        isLoading: false
                    } );
                    highlightMission( mission );
                    if (locate !== false) {
                        $rootScope.$broadcast( '__MAP_SETVIEW__', mission.extent );
                        $rootScope.$broadcast( "DESACTIVATE_POSITION" );
                    }
                    if (mission.displayDone) {
                        vm.showDoneAssets( mission );
                    }
                    for (i in assetsCache[mission.id]) {
                        delete assetsCache[mission.id][i].xmin;
                        delete assetsCache[mission.id][i].xmax;
                        delete assetsCache[mission.id][i].ymin;
                        delete assetsCache[mission.id][i].ymax;
                        delete assetsCache[mission.id][i].geometry;
                    }
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                    $rootScope.missions[mission.id] = mission;
                    Storage.set('missions_' + Storage.get('lastUser'), $rootScope.missions || {});
                } );

            } else if (mission.openned && assetsCache[mission.id] && (mission.assets.length || !mission.activity)) {
                highlightMission( mission );
                if (mission.displayDone) {
                    vm.showDoneAssets( mission );
                }
                if (mission.activity && vm.activities._byId[mission.activity.id] && vm.activities._byId[mission.activity.id].type === "night_tour") {
                    $rootScope.$broadcast( '__MAP_DISPLAY_TRACE__', mission );
                }
            } else if (!mission.openned) {
                $rootScope.$broadcast( 'UNHIGHLIGHT_ASSETS_FOR_MISSION', mission );
                $rootScope.$broadcast( 'UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission );
                if (mission.activity && vm.activities._byId[mission.activity.id] && vm.activities._byId[mission.activity.id].type === "night_tour") {
                    $rootScope.$broadcast( '__MAP_HIDE_TRACE__', mission );
                }
            }
            mission.isLoading = false;
            $rootScope.missions[mission.id] = mission;
            Storage.set('missions_' + Storage.get('lastUser'), $rootScope.missions || {});
        }

        /**
         * @name locateMission
         * @param {integer} $index index of concerned mission in vm.missions attribute
         * @desc Set map view to the mission's extent. If mission has no extent yet, it set it.
         */
        function locateMission(mission) {
            if (!mission.extent) {
                mission.extent = G3ME.getExtentsFromAssetsList( assetsCache[mission.id] );
            }
            $rootScope.$broadcast( '__MAP_SETVIEW__', mission.extent );
            $rootScope.$broadcast( "DESACTIVATE_POSITION" );
        }

        /**
         * @name showReport
         * @param {Object} mission concerned mission
         * @desc Open report with concerned assets
         */
        function showReport(mission) {
            var selectedAssets = [];
            for (var i = 0, assetsLength = assetsCache[mission.id].length; i < assetsLength; i++) {
                if (assetsCache[mission.id][i].selected) {
                    selectedAssets.push( assetsCache[mission.id][i].guid );
                }
            }
            if (mission.activity) {
                $location.path( 'report/' + Site.current.id + '/' + mission.activity.id + '/' + selectedAssets.join( '!' ) + '/' + mission.id );
            } else {
                $location.path( 'report/' + Site.current.id + '//' + selectedAssets.join( '!' ) + '/' + mission.id );
            }
        }

        /**
         * @name launchNightTour
         * @param {Object} mission concerned mission
         * @desc
         */
        function launchNightTour(mission) {
            $rootScope.$broadcast('START_NIGHT_TOUR', mission, assetsCache[mission.id]);
        }


        /**g
         * @name highlightMission
         * @param {Object} mission concerned mission
         * @desc
         */
        function highlightMission(mission) {
            $rootScope.$broadcast( 'HIGHLIGHT_ASSETS_FOR_MISSION', mission, assetsCache[mission.id], null, markerClickHandler );
        }

        /**
         * @name markerClickHandler
         * @param {integer} missionId Concerned mission identifier
         * @param {integer} assetId   Concerned asset identifier
         * @desc This method is called when click event is performed on marker
         */
        function markerClickHandler(missionId, assetId) {
            var mission = vm.missions[missionId],
                asset = assetsCache[missionId][assetId],
                method = (mission.activity && vm.activities._byId[mission.activity.id] &&
                    vm.activities._byId[mission.activity.id].type === "night_tour") ? "NightTour" : "Mission";
            vm["toggleAssetsMarkerFor" + method]( mission, asset );
        }

        /**
         * @name toggleAssetsMarkerForMission
         * @param {object} mission Concerned mission
         * @param {object} asset   Concerned asset
         * @desc This method is called when click event is performed on marker for mission
         */
        function toggleAssetsMarkerForMission(mission, asset) {
            asset.selected = !asset.selected;
            if (!mission.selectedAssets) {
                mission.selectedAssets = 0;
            }
            mission.selectedAssets += asset.selected ? 1 : -1;
            $rootScope.$broadcast( 'TOGGLE_ASSET_MARKER_FOR_MISSION', asset );
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }

        /**
         * @name toggleAssetsMarkerForNightTour
         * @param {object} mission Concerned mission
         * @param {object} asset   Concerned asset
         * @desc This method is called when click event is performed on marker for night tour
         */
        function toggleAssetsMarkerForNightTour(mission, asset) {
            $rootScope.$broadcast( 'TOGGLE_ASSET_MARKER_FOR_NIGHT_TOUR', mission, asset );
        }

        /**
         * @name toggleDoneAssetsVisibility
         * @param {integer} $index index of concerned mission in vm.missions attribute
         * @desc Toggle done assets visibility
         */
        function toggleDoneAssetsVisibility(mission) {
            mission.displayDone = !!!mission.displayDone;
            vm[(mission.displayDone ? 'show' : 'hide') + 'DoneAssets']( mission );
        }

        /**
         * @name showDoneAssets
         * @param {integer} $index index of concerned mission in vm.missions attribute
         * @desc Show done assets
         */
        function showDoneAssets(mission) {
            mission.isLoading = mission.displayDone = true;

            if ((!vm.doneAssetsCache[mission.id] || (vm.doneAssetsCache[mission.id].length < mission.done.length)) && !stopCacheLoop) {
                stopCacheLoop = true;
                return Asset.findAssetsByGuids( mission.done, function(assets) {
                    if (!vm.doneAssetsCache[mission.id] || !vm.doneAssetsCache[mission.id].length) {
                        vm.doneAssetsCache[mission.id] = assets;
                    } else {
                        for (var i = 0, assetsLength = assets.length; i < assetsLength; i++) {
                            if (!vm.doneAssetsCache[mission.id]._byId[assets[i].id]) {
                                vm.doneAssetsCache[mission.id].push( assets[i] );
                                vm.doneAssetsCache[mission.id]._byId[assets[i].id] = assets[i];
                            }
                        }
                    }
                    vm.showDoneAssets( mission );
                } );
            }

            if (stopCacheLoop) {
                stopCacheLoop = undefined;
            }

            $rootScope.$broadcast( 'HIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission, vm.doneAssetsCache[mission.id] );

            mission.isLoading = false;

            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }

        /**
         * @name hideDoneAssets
         * @param {integer} $index index of concerned mission in vm.missions attribute
         * @desc hide done assets
         */
        function hideDoneAssets(mission) {
            mission.displayDone = false;
            $rootScope.$broadcast( 'UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION', mission );
        }


        /**
         * @name addAssetToMission
         * @param {Object} asset
         * @param {Object} mission
         * @desc
         */
        $rootScope.addAssetToMission = function addAssetToMission(asset, mission) {

            mission = vm.missions[mission.id];

            asset.guid = 1 * asset.guid;

            if (mission.assets.indexOf( asset.guid ) !== -1 || mission.done.indexOf( asset.guid ) !== -1) {
                return;
            }

            mission.isLoading = true;

            mission.assets.push( asset.guid );

            if (!mission.postAddedAssets) {
                mission.postAddedAssets = {
                    done: [],
                    assets: [asset.guid]
                };
            } else {
                mission.postAddedAssets.assets.push( asset.guid );
            }

            Storage.set( 'missions_' + Storage.get( 'lastUser' ), vm.missions );

            Asset.findGeometryByGuids( asset.guid, function(assets) {

                if (!assetsCache[mission.id]) {
                    assetsCache[mission.id] = [];
                }
                if (!assetsCache[mission.id]._byId) {
                    assetsCache[mission.id]._byId = {};
                }

                assetsCache[mission.id].push( assets[0] );
                assetsCache[mission.id]._byId[1 * assets[0].guid] = assets[0];

                highlightMission( mission );

                delete assets[0].xmin;
                delete assets[0].xmax;
                delete assets[0].ymin;
                delete assets[0].ymax;

                mission.isLoading = false;
                $scope.$apply();
            } );
        };

        /**
         * @name removeAssetFromMission
         * @param {Object} asset
         * @param {Object} mission
         * @desc
         */
        function removeAssetFromMission(assetid, mission) {
            mission = vm.missions[mission.id] ;
            var asset = assetsCache[mission.id]._byId[assetid] ;
            mission.assets.splice( mission.assets.indexOf( assetid ), 1 );
            mission.postAddedAssets.assets.splice( mission.postAddedAssets.assets.indexOf( asset.guid ), 1 );
            Storage.set( 'missions_' + Storage.get( 'lastUser' ), vm.missions );
            highlightMission( mission );
            $rootScope.$broadcast( "DELETEMARKERFORMISSION", mission, assetsCache[mission.id]._byId[assetid].marker );
            assetsCache[mission.id].splice( assetsCache[mission.id].indexOf( asset ), 1 );
            delete assetsCache[mission.id]._byId[assetid];
        }

        /**
         * @name locateAsset
         * @param {Object} asset
         * @desc
         */
        function locateAsset(mission, assetid) {
            Asset.findAssetsByGuids( assetid, function(assets) {
                G3ME.map.setView( assets[0].getCenter(), 18 );
            } );
        }

        /**
         * @name getAssetLabel
         * @param {Object} asset
         * @desc
         */
        function getAssetLabel(mission, assetid) {
            if (assetsCache[mission.id] && assetsCache[mission.id]._byId && assetsCache[mission.id]._byId[assetid]) {
                return assetsCache[mission.id]._byId[assetid].label;
            } else {
                return "";
            }
        }
    }

})();
