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

angular.module( 'smartgeomobile' ).controller( 'nightTourController', ["$scope", "$rootScope", "$window", "$location", "G3ME", "i18n", "$http", "$route", "Storage", "Synchronizator", "GPS", "Site", "Utils", "Report", "Asset", function($scope, $rootScope, $window, $location, G3ME, i18n, $http, $route, Storage, Synchronizator, GPS, Site, Utils, Report, Asset) {

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

            $scope.$on( "TOGGLE_ASSET_MARKER_FOR_NIGHT_TOUR", $scope.toggleAsset );
            $rootScope.$on( "mapClickHandlerForNighttour", mapClickHandlerForNighttour );

            $scope.$watch( 'nightTourRecording', function(newval) {
                $scope.isFollowingMe = newval;
            } );
            $scope.$watch( 'isFollowingMe', function(newval) {
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

        function mapClickHandlerForNighttour(e, assets) {
            for (var i = 0, ii = assets.length; i < ii; i++) {
                var asset = assets[i] ;

                if ($scope.mission.assets.indexOf( +asset.guid ) === -1 || asset.geometry.type === "LineString" || asset.marker) {
                    continue;
                }

                asset.marker = L.marker( [asset.geometry.coordinates[1], asset.geometry.coordinates[0]] );
                asset.marker.setIcon( $scope._KO_ASSET_ICON );
                asset.isWorking = false;
                asset.timestamp = Date.now();
                (function(asset) {
                    asset.marker.on( 'click', function(e) {
                        $scope.toggleAsset( e, $scope.mission, asset );
                    } );
                })( asset );
                G3ME.map.addLayer( asset.marker );
                assetsCache.push( asset );
            }

        }

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
        $scope.addPositionToTrace = function( /*lat, lng, force*/ ) {
            if (!$scope.mission) {
                return alertify.error( "Erreur : aucune tournée en cours" );
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
            $rootScope.$broadcast( '__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission );
            GPS.stopWatchingPosition( $scope.whereIAm );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.whereIAm = function(lng, lat /*, alt, acc*/ ) {
            $rootScope.$broadcast( '__MAP_HIGHTLIGHT_MY_POSITION', lat, lng );
            $scope.addPositionToTrace( lat, lng );
        };

        /**
         * @memberOf nightTourController
         * @param {float} lat Point's latitude
         * @param {float} lng Point's longitude
         * @desc
         */
        $scope.addPositionToTrace = function(lat, lng) {
            if (!$scope.mission) {
                return alertify.error( "Erreur : aucune tournée en cours" );
            }
            if (!$scope.nightTourRecording) {
                return;
            }
            var traces = Storage.get( 'traces' ) || {},
                currentTrace = traces[$scope.mission.id] || [];

            $scope.lastPositionWasSetByBatmanOn = new Date().getTime();

            currentTrace.push( [lng, lat] );
            traces[$scope.mission.id] = currentTrace;
            Storage.set( 'traces', traces );
            $scope.mission.trace = currentTrace;
            $rootScope.$broadcast( '__MAP_DISPLAY_TRACE__', $scope.mission, false );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.resumeNightTour = function() {
            $rootScope.nightTourRecording = true;
            $scope.stopFollowingPosition();
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.pauseNightTour = function() {
            $rootScope.nightTourRecording = false;
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.closeNightTour = function() {
            alertify.confirm( 'Clôturer la tournée de nuit ?', function(yes) {
                if (!yes) {
                    return;
                }
                var ok = [],
                    ko = [],
                    asset;
                for (var i in assetsCache) {
                    asset = assetsCache[i];
                    (!!asset.isWorking || asset.isWorking === undefined ? ok : ko).push( asset.guid );
                }

                for (var j = 0, jj = $scope.mission.assets.length; j < jj; j++) {
                    if (ok.indexOf( $scope.mission.assets[j] ) === -1 && ko.indexOf( $scope.mission.assets[j] ) === -1) {
                        ok.push( $scope.mission.assets[j] );
                    }
                }

                $scope.mission.displayDone = false;
                $scope.stopNightTour( ok, ko );
            } );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.stopNightTour = function(ok, ko) {

            if (secureInterval) {
                clearInterval( secureInterval );
            }

            $rootScope.nightTourInProgress = false;
            $rootScope.nightTourRecording = false;
            $scope.stopFollowingPosition();
            $rootScope.$broadcast( '__MAP_UNHIGHTLIGHT_MY_POSITION', $scope.mission );
            ok = ok || [];
            ko = ko || [];
            var asset;

            if ((ko.length + ok.length) === 0) {
                for (var i in assetsCache) {
                    asset = assetsCache[i];
                    if (asset.isWorking !== undefined) {
                        (!!asset.isWorking ? ok : ko).push( asset.guid );
                    }
                }
            }
            $scope.saving = true;
            $scope.sendKoReports( ko, function() {
                $scope.sendOkReports( ok, function() {
                    $route.reload();
                    $scope.saving = false;
                } );
            } );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.sendOkReports = function(ok, callback) {
            callback = callback || function() {};

            if (!ok.length) {
                return callback();
            }

            var report = angular.extend( new Report( ok, $scope.mission.activity.id, $scope.mission.id ), {
                assets: ok,
                fields: {},
                uuid: window.uuid()
            } );

            applyDefaultValues( report, $scope.activity );
            var tmp = angular.copy( report );
            tmp.fields[$scope.activity.night_tour.switch_field] = $scope.activity.night_tour.ok_value;
            tmp.activity = tmp.activity.id;
            Synchronizator.addNew( tmp );
            callback();
        };



        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.sendKoReports = function(ko, callback) {
            callback = callback || function() {};
            if (!ko.length) {
                return callback();
            }

            var report = angular.extend( new Report( ko, $scope.mission.activity.id, $scope.mission.id ), {
                assets: ko,
                fields: {},
                uuid: window.uuid()
            } );

            applyDefaultValues( report, $scope.activity );
            var tmp = angular.copy( report );
            tmp.fields[$scope.activity.night_tour.switch_field] = $scope.activity.night_tour.ko_value;
            tmp.activity = tmp.activity.id;
            Synchronizator.addNew( tmp );
            callback();
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
                            def = date.getUTCFullYear() + '-' + Utils.pad( date.getUTCMonth() + 1 ) + '-' + Utils.pad( date.getUTCDate() );
                        }
                    } else {
                        def = getValueFromAssets( def.pkey, act.okeys[0] );
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
        $scope.startNightTour = function(event, mission) {

            if (secureInterval) {
                clearInterval( secureInterval );
            }

            setInterval( function() {
                $scope.secureData();
            }, secureIntervalTime );

            $rootScope.stopConsultation();

            if ($rootScope.nightTourInProgress) {
                return alertify.error( "Erreur : Une tournée est déjà en cours, impossible de démarrer cette tournée." );
            } else if (Site.current.activities._byId[mission.activity.id].type !== "night_tour") {
                return alertify.error( "Erreur : L'activité de cette mission n'est pas une tournée de nuit." );
            }

            $scope.activity = Site.current.activities._byId[mission.activity.id];

            $scope.mission = mission;
            $scope.isFollowingMe = true;

            $rootScope.$broadcast( '_MENU_CLOSE_' );
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
            $( $( ".consultation-panel" )[1] ).removeClass( 'open' ).css( 'width', 0 );
        };

        $scope.open = function() {
            if ($scope.state === 'open') {
                return;
            }
            G3ME.reduceMapWidth( window.Smartgeo._SIDE_MENU_WIDTH );
            if (Utils.isRunningOnLittleScreen()) {
                $rootScope.$broadcast( '_MENU_CLOSE_' );
            }
            $scope.state = 'open';
            $( $( ".consultation-panel" )[1] ).addClass( 'open' ).css( 'width', window.Smartgeo._SIDE_MENU_WIDTH );
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
            $rootScope.$broadcast( '__MAP_SETVIEW__', $scope.mission.extent );
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
            asset.isWorking = !asset.isWorking ;
            asset.marker.setIcon( asset.isWorking ? $scope._OK_ASSET_ICON : $scope._KO_ASSET_ICON );
        };

        /**
         * @memberOf nightTourController
         * @desc
         */
        $scope.secureData = function() {
            var now = Date.now(),
                payloadKO = [] ,
                payloadOK = [] ;
            for (var i = 0; i < assetsCache.length; i++) {
                if (!assetsCache[i].alreadySent && (now - assetsCache[i].timestamp) > secureIntervalTime) {
                    if (assetsCache[i].isWorking) {
                        payloadOK.push( assetsCache[i].guid );
                    } else {
                        payloadKO.push( assetsCache[i].guid );
                    }
                    assetsCache[i].alreadySent = true ;
                }
            }
            $scope.sendKoReports( payloadKO, function() {
                $scope.sendOkReports( payloadOK, function() {} );
            } );
        };

    }
] );
