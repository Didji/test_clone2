angular.module('smartgeomobile').controller('nightTourController', function ($scope, $rootScope, $window, $location, Smartgeo, G3ME, i18n, $http, $route, Report) {

    'use strict';

    /**
     * @ngdoc property
     * @name nightTourController#_DRAG_THRESHOLD
     * @propertyOf nightTourController
     * @description
     */
    $scope._DRAG_THRESHOLD = 50;

    $scope._OK_ASSET_ICON = L.icon({
        iconUrl: 'javascripts/vendors/images/night-tour-ok.png',
        iconSize: [65, 89],
        iconAnchor: [32, 89],
    });
    $scope._KO_ASSET_ICON = L.icon({
        iconUrl: 'javascripts/vendors/images/night-tour-ko.png',
        iconSize: [65, 89],
        iconAnchor: [32, 89],
    });
    $scope._DONE_ASSET_ICON = L.icon({
        iconUrl: 'javascripts/vendors/images/night-tour-done.png',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
    });

    /**
     * @ngdoc method
     * @name nightTourController#initialize
     * @methodOf nightTourController
     * @description
     */
    $scope.initialize = function () {
        $rootScope.nightTourInProgress = false;
        $scope.state = 'closed';
        $scope.$on("START_NIGHT_TOUR", $scope.startNightTour);
        $scope.$watch('nightTourInProgress', function (newval, oldval) {
            if (newval === true) {
                $scope.startFollowingPosition();
                $scope.open();
            } else {
                $scope.stopFollowingPosition();
                if (oldval === true) {
                    $rootScope.openLeftMenu();
                }
                $scope.close();
            }
        });

        angular.element($window).bind("resize", function (e) {
            if ($scope.state === 'open') {
                $scope.close();
                $scope.open();
            }
        });

        $scope.$on("TOGGLE_ASSET_MARKER_FOR_NIGHT_TOUR", $scope.toggleAsset);


        $scope.$watch('nightTourRecording', function (newval, oldval) {
            $scope.isFollowingMe = newval;
        });
        $scope.$watch('isFollowingMe', function (newval, oldval) {
            $scope[(newval === true ? 'start' : 'stop') + 'FollowingPosition']();
        });

        G3ME.map.on('dragend', function (event) {
            if (event.distance > $scope._DRAG_THRESHOLD) {
                $scope.isFollowingMe = false;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // function whereIAm(lng, lat, alt, acc){
    //     $scope.whereIAm(lng, lat, alt, acc);
    // }

    /**
     * @ngdoc method
     * @name nightTourController#startFollowingPosition
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.startFollowingPosition = function () {
        $scope.stopFollowingPosition();
        Smartgeo.startWatchingPosition($scope.whereIAm);
    };

    /**
     * @ngdoc method
     * @name nightTourController#stopFollowingPosition
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.stopFollowingPosition = function () {
        $rootScope.$broadcast('__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission);
        Smartgeo.stopWatchingPosition($scope.whereIAm);
    };

    /**
     * @ngdoc method
     * @name nightTourController#whereIAm
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.whereIAm = function (lng, lat, alt, acc) {
        $rootScope.$broadcast('__MAP_HIGHTLIGHT_MY_POSITION', lat, lng);
        $scope.addPositionToTrace(lat, lng);
    };

    /**
     * @ngdoc method
     * @name nightTourController#addPositionToTrace
     * @methodOf nightTourController
     * @param {float} lat Point's latitude
     * @param {float} lng Point's longitude
     * @description
     *
     */
    $scope.addPositionToTrace = function (lat, lng, force) {
        if (!$scope.mission) {
            return alertify.error("Erreur : aucune tournée en cours");
        }
        if (!$scope.nightTourRecording) {
            return;
        }
        var traces = Smartgeo.get('traces') || {},
            currentTrace = traces[$scope.mission.id] || [],
            previousPosition = currentTrace[currentTrace.length - 1];

        if (previousPosition) {
            var distanceFromLastPosition = L.latLng(previousPosition).distanceTo(L.latLng([lng, lat])),
                now = new Date().getTime(),
                timeBetweenLastPositionAndNow = (now - $scope.lastPositionWasSetByBatmanOn || 0);

            if (!force && previousPosition && (distanceFromLastPosition > 500 || distanceFromLastPosition === 0) && timeBetweenLastPositionAndNow < 15000) {
                // console.log('return');
                // return;
            }
        }

        $scope.lastPositionWasSetByBatmanOn = new Date().getTime();

        currentTrace.push([lng, lat]);
        traces[$scope.mission.id] = currentTrace;
        Smartgeo.set('traces', traces);
        $scope.mission.trace = currentTrace;
        $rootScope.$broadcast('__MAP_DISPLAY_TRACE__', $scope.mission, false);
    };

    /**
     * @ngdoc method
     * @name nightTourController#resumeNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.resumeNightTour = function () {
        $rootScope.nightTourRecording = true;
        $scope.stopFollowingPosition();
    };

    /**
     * @ngdoc method
     * @name nightTourController#pauseNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.pauseNightTour = function () {
        $rootScope.nightTourRecording = false;
    };

    /**
     * @ngdoc method
     * @name nightTourController#closeNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.closeNightTour = function () {
        alertify.confirm('Clôturer la tournée de nuit ?', function (yes) {
            if (!yes) {
                return;
            }
            var ok = [],
                ko = [],
                asset;
            for (var i in $scope.assetsCache) {
                asset = $scope.assetsCache[i];
                (asset.isWorking === true || asset.isWorking === undefined ? ok : ko).push(asset.guid);
            }
            $scope.mission.displayDone = false;
            $scope.stopNightTour(ok, ko);
        });
    };

    /**
     * @ngdoc method
     * @name nightTourController#stopNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.stopNightTour = function (ok, ko) {
        $rootScope.nightTourInProgress = false;
        $rootScope.nightTourRecording = false;
        $scope.stopFollowingPosition();
        $rootScope.$broadcast('__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission);
        ok = ok || [];
        ko = ko || [];
        var asset;

        if ((ko.length + ok.length) === 0) {
            for (var i in $scope.assetsCache) {
                asset = $scope.assetsCache[i];
                if (asset.isWorking !== undefined) {
                    (asset.isWorking === true ? ok : ko).push(asset.guid);
                }
            }
        }
        $scope.sendOkReports(ok, function () {
            $scope.sendKoReports(ko, function () {
                $route.reload();
            });
        });
    };

    /**
     * @ngdoc method
     * @name nightTourController#sendOkReports
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.sendOkReports = function (ok, callback) {
        callback = callback || function () {};

        if (!ok.length) {
            return callback();
        }

        var report = {
            assets: ok,
            fields: {},
            mission: $scope.mission.id,
            activity: $scope.mission.activity.id,
            uuid: Smartgeo.uuid()
        };
        applyDefaultValues(report, $scope.activity);
        report.fields[$scope.activity.night_tour.switch_field] = $scope.activity.night_tour.ok_value;
        Report.save(report).then(null, null, callback);
    };



    /**
     * @ngdoc method
     * @name nightTourController#sendKoReports
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.sendKoReports = function (ko, callback) {
        callback = callback || function () {};
        if (!ko.length) {
            return callback();
        }
        var report = {
            assets: ko,
            fields: {},
            mission: $scope.mission.id,
            activity: $scope.mission.activity.id,
            uuid: Smartgeo.uuid()
        };
        applyDefaultValues(report, $scope.activity);
        report.fields[$scope.activity.night_tour.switch_field] = $scope.activity.night_tour.ko_value;
        Report.save(report).then(null, null, callback);
    };

    function applyDefaultValues(report, act) {
        var fields = report.fields,
            assets = report.assets,
            def, i, numTabs, j, numFields, tab, field, date;

        function pad(number) {
            if (number < 10) {
                return '0' + number;
            }
            return number;
        }

        function getList(pkey, okey) {
            var mm = $rootScope.site.metamodel[okey];
            for (var i in mm.tabs) {
                for (var j in mm.tabs[i].fields) {
                    if (mm.tabs[i].fields[j].key === pkey) {
                        return mm.tabs[i].fields[j].options;
                    }
                }
            }
            return false;
        }

        function getValueFromAssets(pkey, okey) {
            var rv = {}, val;
            for (var i = 0, lim = assets.length; i < lim; i++) {
                var a = JSON.parse(assets[i].asset).attributes,
                    list = getList(pkey, okey);

                val = a[pkey];
                if (list && $rootScope.site.lists[list] && $rootScope.site.lists[list][val]) {
                    val = $rootScope.site.lists[list][val];
                }

                rv[assets[i].id] = val;
            }
            return rv;
        }

        for (i = 0, numTabs = act.tabs.length; i < numTabs; i++) {
            tab = act.tabs[i];
            for (j = 0, numFields = tab.fields.length; j < numFields; j++) {
                field = tab.fields[j];
                def = field['default'];
                if (!def) {
                    continue;
                }
                if ('string' === typeof def) {
                    if (field.type === 'D' && def === '#TODAY#') {
                        date = new Date();
                        def = date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
                    }
                } else {
                    def = getValueFromAssets(def.pkey, act.okeys[0]);
                }
                if (!def) {
                    continue;
                }
                fields[field.id] = def;
            }
        }
    }




    /**
     * @ngdoc method
     * @name nightTourController#startNightTour
     * @methodOf nightTourController
     * @param {object} event        This method is called by event, so first argument is this event
     * @param {object} mission      This parameter MUST BE a night tour
     * @param {array}  assetsCache  Array of mission's assets, fetched from database
     * @description
     *
     */
    $scope.startNightTour = function (event, mission, assetsCache) {

        $rootScope.stopConsultation();

        if ($rootScope.nightTourInProgress) {
            return alertify.error("Erreur : Une tournée est déjà en cours, impossible de démarrer cette tournée.");
        } else if ($rootScope.site.activities._byId[mission.activity.id].type !== "night_tour") {
            return alertify.error("Erreur : L'activité de cette mission n'est pas une tournée de nuit.");
        }

        $scope.activity = $rootScope.site.activities._byId[mission.activity.id];

        $scope.assetsCache = assetsCache;
        $scope.mission = mission;
        $scope.isFollowingMe = true;

        $rootScope.closeLeftMenu();
        $rootScope.nightTourInProgress = true;
        $rootScope.nightTourRecording = true;

        $scope.open();

        if (!$scope.$$phase) {
            $scope.$apply();
        }

    };

    $scope.close = function () {
        if ($scope.state === 'closed') {
            return;
        }
        G3ME.fullscreen();
        $scope.state = 'closed';
        $($(".consultation-panel")[1]).removeClass('open').css('width', 0);
    };

    $scope.open = function () {
        if ($scope.state === 'open') {
            return;
        }
        G3ME.reduceMapWidth(Smartgeo._SIDE_MENU_WIDTH);
        if (Smartgeo.isRunningOnLittleScreen()) {
            $rootScope.$broadcast('_MENU_CLOSE_');
        }
        $scope.state = 'open';
        $($(".consultation-panel")[1]).addClass('open').css('width', Smartgeo._SIDE_MENU_WIDTH);
    };


    /**
     * @ngdoc method
     * @name nightTourController#togglePanel
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.togglePanel = function () {
        $scope[($scope.state === 'open' ? 'close' : 'open')]();
    };

    /**
     * @ngdoc method
     * @name nightTourController#locateMission
     * @methodOf nightTourController
     * @description
     * Set map view to the mission's extent. If mission has no extent yet, it set it.
     */
    $scope.locateMission = function () {
        if (!$scope.mission.extent) {
            $scope.mission.extent = G3ME.getExtentsFromAssetsList($scope.assetsCache[$scope.mission.id]);
        }
        $rootScope.$broadcast('__MAP_SETVIEW__', $scope.mission.extent);
    };

    /**
     * @ngdoc method
     * @name nightTourController#toggleAsset
     * @methodOf nightTourController
     * @param {object} event        This method is called by event, so first argument is this event
     * @param {object} mission      This parameter MUST BE a night tour
     * @param {array}  asset        Clicked asset on map (contains marker)
     * @description
     *
     */
    $scope.toggleAsset = function (event, mission, asset) {
        if (!$rootScope.nightTourRecording) {
            // TODO: afficher une popup pour signaler que la tournée n'est pas en cours
            return;
        }
        asset.isWorking = (asset.isWorking === undefined ? false : !asset.isWorking);
        asset.marker.setIcon(asset.isWorking ? $scope._OK_ASSET_ICON : $scope._KO_ASSET_ICON);
    };

});
