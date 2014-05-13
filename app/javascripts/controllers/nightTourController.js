/**
 * @class       nightTourController
 * @classdesc   Controlleur du mode tournée de nuit
 *
 * @property {number} _DRAG_THRESHOLD Seuil de drag pour l'arrêt de la fonction de suivi (en pixel)
 * @property {L.icon} _OK_ASSET_ICON Cache d'icône pour les objets de type OK
 * @property {L.icon} _KO_ASSET_ICON Cache d'icône pour les objets de type KO
 * @property {L.icon} _DONE_ASSET_ICON Cache d'icône pour les objets de type DONE
 * @property {boolean} nightTourInProgress Une tournée est elle en cours
 * @property {string} state Status du panneau latéral ('open' ou 'closed')
 */

angular.module('smartgeomobile').controller('nightTourController', function ($scope, $rootScope, $window, $location, Smartgeo, G3ME, i18n, $http, $route, Report) {

    'use strict';

    /**
     * @memberOf nightTourController
     * @desc
     */
    $scope.initialize = function () {

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

    /**
     * @memberOf nightTourController
     * @desc
     */
    $scope.startFollowingPosition = function () {
        $scope.stopFollowingPosition();
        Smartgeo.startWatchingPosition($scope.whereIAm);
    };

    /**
     * @memberOf nightTourController
     * @desc
     */
    $scope.stopFollowingPosition = function () {
        $rootScope.$broadcast('__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission);
        Smartgeo.stopWatchingPosition($scope.whereIAm);
    };

    /**
     * @memberOf nightTourController
     * @desc
     */
    $scope.whereIAm = function (lng, lat, alt, acc) {
        $rootScope.$broadcast('__MAP_HIGHTLIGHT_MY_POSITION', lat, lng);
        $scope.addPositionToTrace(lat, lng);
    };

    /**
     * @memberOf nightTourController
     * @param {float} lat Point's latitude
     * @param {float} lng Point's longitude
     * @desc
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
     * @memberOf nightTourController
     * @desc
     */
    $scope.resumeNightTour = function () {
        $rootScope.nightTourRecording = true;
        $scope.stopFollowingPosition();
    };

    /**
     * @memberOf nightTourController
     * @desc
     */
    $scope.pauseNightTour = function () {
        $rootScope.nightTourRecording = false;
    };

    /**
     * @memberOf nightTourController
     * @desc
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
     * @memberOf nightTourController
     * @desc
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
     * @memberOf nightTourController
     * @desc
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
     * @memberOf nightTourController
     * @desc
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
     * @memberOf nightTourController
     * @param {object} event        This method is called by event, so first argument is this event
     * @param {object} mission      This parameter MUST BE a night tour
     * @param {array}  assetsCache  Array of mission's assets, fetched from database
     * @desc
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
     * @memberOf nightTourController
     * @desc
     */
    $scope.togglePanel = function () {
        $scope[($scope.state === 'open' ? 'close' : 'open')]();
    };

    /**
     * @memberOf nightTourController
     * @desc
     */
    $scope.locateMission = function () {
        if (!$scope.mission.extent) {
            $scope.mission.extent = G3ME.getExtentsFromAssetsList($scope.assetsCache[$scope.mission.id]);
        }
        $rootScope.$broadcast('__MAP_SETVIEW__', $scope.mission.extent);
    };

    /**
     * @memberOf nightTourController
     * @param {object} event        This method is called by event, so first argument is this event
     * @param {object} mission      This parameter MUST BE a night tour
     * @param {array}  asset        Clicked asset on map (contains marker)
     * @desc
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
