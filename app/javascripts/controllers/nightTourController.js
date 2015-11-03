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

angular.module( 'smartgeomobile' ).controller( 'nightTourController', 
    ["$scope", "$rootScope", "$window", "$location", "G3ME", "i18n", "$http", "$route", "Storage", "Synchronizator", "GPS", "Site", "Utils", "Report", "Asset", "$interval", 
    function($scope, $rootScope, $window, $location, G3ME, i18n, $http, $route, Storage, Synchronizator, GPS, Site, Utils, Report, Asset, $interval) {

        'use strict';

        var secureInterval,
            secureIntervalTime = 30000,
            assetsCache = [];

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.initialize = function() {


            $scope._DRAG_THRESHOLD = 50;

            $scope._OK_ASSET_ICON = L.icon( {
                iconUrl: 'javascripts/vendors/images/night-tour-ok.png',
                iconSize: [65, 89],
                iconAnchor: [32, 89]
            } );
            $scope._KO_ASSET_ICON = L.icon( {
                iconUrl: 'javascripts/vendors/images/night-tour-ko.png',
                iconSize: [65, 89],
                iconAnchor: [32, 89]
            } );
            $scope._DONE_ASSET_ICON = L.icon( {
                iconUrl: 'javascripts/vendors/images/night-tour-done.png',
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            } );

            $rootScope.nightTourInProgress = false;
            $scope.state = 'closed';
            $scope.$on( "START_NIGHT_TOUR", $scope.startNightTour );

            $scope.$watch( 'nightTourInProgress', function(newval, oldval) {
                if (!!newval) {
                    $scope.startFollowingPosition();
                    $scope.open();
                } else {
                    $scope.stopFollowingPosition();
                    if (oldval === true) {
                        $rootScope.$broadcast( '_MENU_CLOSE_' );
                    }
                }
            } );

            angular.element( $window ).bind( "resize", function() {
                if ($rootScope.nightTourInProgress && $scope.state === 'open') {
                    $scope.close();
                    $scope.open();
                }
            } );

            $scope.$on("TOGGLE_ASSET_MARKER_FOR_NIGHT_TOUR", $scope.toggleAsset);

            $scope.$watch('nightTourRecording', function(newval) {
                $scope.isFollowingMe = newval;
            } );
            $scope.$watch('isFollowingMe', function(newval) {
                $scope[(newval === true ? 'start' : 'stop') + 'FollowingPosition']();
            } );

            G3ME.map.on( 'dragend', function(event) {
                if (event.distance > $scope._DRAG_THRESHOLD) {
                    $scope.isFollowingMe = false;
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }

            } );
            $scope.saving = false;
        };

        //on initialise les tableau de cache
        $scope.payloadKO = {status: 'PayloadKO' , guids: []} ;
        $scope.payloadOK = {status: 'PayloadOK' , guids: []} ;
        $scope.ok = {status : 'OK' , guids : []};
        $scope.ko = {status : 'KO' , guids : []};

        /*
        //Abonnements aux evenements
        //ici on recupere l'evenement envoyé lorsqu'un rapport est envoyé depuis le synchronisateur
        */

        //quand retour promesse rapport ko,; envoyé rapport ok; et vider tableau des objet ok en cache;
        var clearPromiseKO = $rootScope.$on("returnNewReportSynchronizatorPromiseKO",function(){
            $scope.sendReports($scope.ok);
            console.log("[NIGHTTOUR] CRs saved, ko=" + $scope.ko.guids);
            $scope.ko.guids = [];
        });

        //quand retour promesse rapport ok; vider tableau des objet ko en cache; recharger page et vider les variables d'abonnement.
        var clearPromiseOK = $rootScope.$on("returnNewReportSynchronizatorPromiseOK",function(){
            console.log("[NIGHTTOUR] CRs saved, ok=" + $scope.ok.guids);
            $scope.ok.guids = [];
            $scope.saving = false;
            $route.reload();
            $scope.clearAllSubscribeEvent();
        });

        //quand retour promesse rapport payloadko;envoyé rapport payload ok; vider tableau des objet payloadKo en cache;
       var clearPromisePayloadKO = $rootScope.$on("returnNewReportSynchronizatorPromisePayloadKO",function(){
            console.log("[NIGHTTOUR] CRs secured, payloadko=" + $scope.payloadKO.guids);
            $scope.sendReports($scope.payloadOK);
            $scope.payloadKO.guids = [];
        });

        //quand retour promesse rapport payloadok; vider tableau des objet payloadKo en cache;
        var clearPromisePayloadOK = $rootScope.$on("returnNewReportSynchronizatorPromisePayloadOK",function(){
            console.log("[NIGHTTOUR] CRs secured, payloadok=" + $scope.payloadOK.guids);
            $scope.payloadOK.guids = [];
        });

        /**
         * @memberOf nightTourController
         * @description supprime tout les abonnements sur les événements .
         */

        $scope.clearAllSubscribeEvent = function(){
            $scope.$on('$destroy', function() {
                clearPromisePayloadKO();
                clearPromisePayloadOK();
                clearPromiseKO();
                clearPromiseOK();
            });
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.startFollowingPosition = function() {
            $scope.stopFollowingPosition();
            GPS.startWatchingPosition( $scope.whereIAm );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.stopFollowingPosition = function() {
            $rootScope.$broadcast( '__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission );
            GPS.stopWatchingPosition( $scope.whereIAm );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.whereIAm = function(lng, lat) {
            $rootScope.$broadcast( '__MAP_HIGHTLIGHT_MY_POSITION', lat, lng );
            $scope.addPositionToTrace( lat, lng );
        };

        /**
         * @memberOf nightTourController
         * @param {float} lat Point's latitude
         * @param {float} lng Point's longitude
         * @desc
         */
        $scope.addPositionToTrace = function() {
            if (!$scope.mission) {
                return alertify.error(i18n.get("_NIGHTTOUR_NO_RUNNING_TOUR_"));
            }
            if (!$scope.nightTourRecording) {
                return;
            }
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.stopFollowingPosition = function() {
            $rootScope.$broadcast('__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission);
            GPS.stopWatchingPosition($scope.whereIAm);
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.whereIAm = function(lng, lat) {
            $rootScope.$broadcast('__MAP_HIGHTLIGHT_MY_POSITION', lat, lng);
            $scope.addPositionToTrace(lat, lng);
        };

        /**
         * @memberOf nightTourController
         * @param {float} lat Point's latitude
         * @param {float} lng Point's longitude
         * @desc
         */
        $scope.addPositionToTrace = function(lat, lng) {
            if (!$scope.mission) {
                return alertify.error(i18n.get("_NIGHTTOUR_NO_RUNNING_TOUR_"));
            }
            if (!$scope.nightTourRecording) {
                return;
            }
            var traces = Storage.get('traces') || {},
                currentTrace = traces[$scope.mission.id] || [];

            $scope.lastPositionWasSetByBatmanOn = new Date().getTime();

            currentTrace.push([lng, lat]);
            traces[$scope.mission.id] = currentTrace;
            Storage.set('traces', traces);
            $scope.mission.trace = currentTrace;
            $rootScope.$broadcast('__MAP_DISPLAY_TRACE__', $scope.mission, false);
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.resumeNightTour = function() {
            console.debug("[NIGHTTOUR] Resume mission " + $scope.mission.id);
            $rootScope.nightTourRecording = true;
            $scope.stopFollowingPosition();
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.pauseNightTour = function() {
            console.debug("[NIGHTTOUR] Pause mission " + $scope.mission.id);
            $rootScope.nightTourRecording = false;
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.closeNightTour = function() {
            console.debug("[NIGHTTOUR] Close mission " + $scope.mission.id);
            alertify.confirm(i18n.get("_NIGHTTOUR_CLOSE_CONFIRM_"), function(yes) {
                if (!yes) {
                    return;
                }
                var asset;
                for (var i = 0; i < $scope.assetsCache.length; i++) {
                    asset = $scope.assetsCache[i];
                    if (asset.alreadySent) {
                        continue;
                    }
                    (asset.isWorking === true || asset.isWorking === undefined ? $scope.ok.guids : $scope.ko.guids).push(asset.guid);
                }

                $scope.mission.displayDone = false;
                $scope.stopNightTour();
            });
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.stopNightTour = function() {
            console.debug("[NIGHTTOUR] Stop mission " + $scope.mission.id);
            if (secureInterval) {
                $interval.cancel( secureInterval );
            }
            $rootScope.nightTourInProgress = false;
            $rootScope.nightTourRecording = false;
            $scope.stopFollowingPosition();
            $rootScope.$broadcast('__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission);
            var asset;
            if (($scope.ko.guids.length + $scope.ok.guids.length) === 0) {
                for (var i in $scope.assetsCache) {
                    asset = $scope.assetsCache[i];
                    if (asset.alreadySent) {
                        continue;
                    }
                    if (asset.isWorking !== undefined) {
                        (!!asset.isWorking ? $scope.ok.guids : $scope.ko.guids).push(asset.guid);
                    }
                }
            }
            $scope.saving = true;
            if ($scope.ko.guids.length) {
                $scope.sendReports($scope.ko);
            } else if ($scope.ok.guids.length) {
                $scope.sendReports($scope.ok);
            } else {
                $scope.saving = false;
                $scope.clearAllSubscribeEvent();
                $route.reload();
            }
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.sendReports = function(obj) {

            if (!obj.guids.length) {
                if (obj.status === "OK") {
                    $scope.saving = false;
                    $scope.clearAllSubscribeEvent();
                    $route.reload();
                    return;
                } else {
                    return;
                }
            }
            if ($scope.mission) {
                var report = angular.extend(new Report(obj.guids, $scope.mission.activity.id, $scope.mission.id), {
                    assets: obj.guids,
                    fields: {},
                    uuid: window.uuid(),
                    status: obj.status,
                });
                applyDefaultValues(report, $scope.activity);
                var tmp = angular.copy(report);
                obj.status = obj.status.replace('payload', '');
                tmp.fields[$scope.activity.night_tour.switch_field] = $scope.activity.night_tour[obj.status + "_value"];
                tmp.activity = tmp.activity.id;
                Synchronizator.addNew(tmp);
            }
        };

        function applyDefaultValues(report, act) {
            var fields = report.fields,
                assets = report.assets,
                def, i, numTabs, j, numFields, tab, field, date;

            function getValueFromAssets(pkey, okey) {
                var rv = {},
                    val;
                for (var i = 0, lim = assets.length; i < lim; i++) {
                    var a = JSON.parse( assets[i].asset ).attributes,
                        list = Site.getList( pkey, okey );

                    val = a[pkey];
                    if (list && Site.current.lists[list] && Site.current.lists[list][val]) {
                        val = Site.current.lists[list][val];
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
                            def = date.getUTCFullYear() + '-' + Utils.pad(date.getUTCMonth() + 1) + '-' + Utils.pad(date.getUTCDate());
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
        $scope.startNightTour = function(event, mission, assetsCache) {
            console.debug("[NIGHTTOUR] Start mission " + mission.id);
            if (secureInterval) {
                $interval.cancel(secureInterval);
            }

            secureInterval = $interval( function() {
                $scope.secureData();
            }, secureIntervalTime);

            $rootScope.stopConsultation();

            if ($rootScope.nightTourInProgress) {
                return alertify.error(i18n.get("_NIGHTTOUR_ALREADY_RUNNING_TOUR_"));
            } else if (Site.current.activities._byId[mission.activity.id].type !== "night_tour") {
                return alertify.error(i18n.get("_NIGHTTOUR_NOT_A_NIGHT_TOUR"));
            }

            $scope.activity = Site.current.activities._byId[mission.activity.id];
            $scope.assetsCache = assetsCache;
            $scope.mission = mission;
            $scope.isFollowingMe = true;
            $rootScope.$broadcast('_MENU_CLOSE_');
            $rootScope.nightTourInProgress = true;
            $rootScope.nightTourRecording = true;
            $scope.open();

            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.close = function() {
            if ($scope.state === 'closed') {
                return;
            }

            G3ME.fullscreen();
            $scope.state = 'closed';
            $($(".consultation-panel")[1]).removeClass('open').css('width', 0);
        };

        $scope.open = function() {
            if ($scope.state === 'open') {
                return;
            }
            G3ME.reduceMapWidth(window.Smartgeo._SIDE_MENU_WIDTH);
            if (Utils.isRunningOnLittleScreen()) {
                $rootScope.$broadcast('_MENU_CLOSE_');
            }
            $scope.state = 'open';
            $($(".consultation-panel")[1]).addClass('open').css('width', window.Smartgeo._SIDE_MENU_WIDTH);
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.togglePanel = function() {
            $scope[($scope.state === 'open' ? 'close' : 'open')]();
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.locateMission = function() {
            $rootScope.$broadcast('__MAP_SETVIEW__', $scope.mission.extent);
        };

        /**
         * @memberOf nightTourController
         * @param {object} event        This method is called by event, so first argument is this event
         * @param {object} mission      This parameter MUST BE a night tour
         * @param {array}  asset        Clicked asset on map (contains marker)
         * @desc
         */
        $scope.toggleAsset = function(event, mission, asset) {
            if (!$rootScope.nightTourRecording) {
                return;
            }
            asset.isWorking = (asset.isWorking === undefined ? false : !asset.isWorking);
            asset.marker.setIcon(asset.isWorking ? $scope._OK_ASSET_ICON : $scope._KO_ASSET_ICON);
            asset.timestamp = Date.now();
        };

        /**
         * @memberOf nightTourController
         * @desc on alimente les tableau payloadok et payloadko en cache; puis on les envoient sous forme de rapports.
         */
        $scope.secureData = function() {
            if ($scope.assetsCache) {
                var now = Date.now();
                for (var i = 0; i < $scope.assetsCache.length; i++) {
                    if (!$scope.assetsCache[i].alreadySent && (now - $scope.assetsCache[i].timestamp) > secureIntervalTime) {
                        if ($scope.assetsCache[i].isWorking) {
                            $scope.payloadOK.guids.push($scope.assetsCache[i].guid);
                        } else {
                            $scope.payloadKO.guids.push($scope.assetsCache[i].guid);
                        }
                        $scope.assetsCache[i].alreadySent = true ;
                    }
                }

                if ($scope.payloadKO.guids.length) {
                    $scope.sendReports($scope.payloadKO);
                } else if ($scope.payloadOK.guids.length) {
                    $scope.sendReports($scope.payloadOK);
                } else {
                    return;
                }
            }
        };
    }
] );
