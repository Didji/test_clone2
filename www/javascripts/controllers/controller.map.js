(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('MapController', MapController);

    MapController.$inject = ["$scope", "$rootScope", "G3ME", "Storage", "$location", "i18n", "Icon", "Asset", "Site", "GPS", "Installer", "Marker", "MultiReport", "Utils", "Authenticator", "Right"];

    /**
     * @class MapController
     * @desc Controlleur de la cartographie.
     */
    function MapController($scope, $rootScope, G3ME, Storage, $location, i18n, Icon, Asset, Site, GPS, Installer, Marker, MultiReport, Utils, Authenticator, Right) {

        var LAST_USERS_LOCATION = [],
            lastViewTimeout = 0,
            consultationIsEnabled = false,
            POSITION_ACTIVATE = false,
            CONSULTATION_CONTROL, POSITION_CIRCLE, POSITION_MARKER, POSITION_CONTROL, POSITION_ZOOM, FIRST_POSITION,
            intent;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            $rootScope.currentPage = "Cartographie";

            if ((Date.now() - (Site.current.timestamp * 1000)) > 86400000) {
                Installer.update(Site.current, undefined, Right.get('onlyUpdateSiteDaily'));
            }

            G3ME.initialize([
                [Site.current.extent.ymin, Site.current.extent.xmin],
                [Site.current.extent.ymax, Site.current.extent.xmax]
            ])
                .on('click', mapClickHandler)
                .on('dragend', dragEndHandler)
                .addControl(Utils.makeControl(i18n.get('_MAP_REFERENCE_VIEW_CONTROL'), "fa-arrows-alt", setReferenceView));

            Authenticator.silentLogin(G3ME.BackgroundTile.redraw);

            (Storage.get('user_position_activated') ? activatePosition : angular.noop)();

            $scope.$on("ACTIVATE_CONSULTATION", function () {
                activateConsultation();
            });

            $scope.$on("ACTIVATE_POSITION", function () {
                activatePosition();
            });

            $scope.$on("$destroy", controllerDestroyHandler);

            $rootScope.activatePosition = activatePosition;
            $rootScope.stopPosition = stopPosition;
            $rootScope.activateConsultation = activateConsultation;
            $rootScope.stopConsultation = stopConsultation;

            if ($rootScope.noGps == true) {
                $rootScope.noGps = false;
                stopPosition();
            };

            intent = Storage.get('intent');

            if (intent) {
                setTimeout(intentHandler, 0);
            }
        }

        /**
         * @name intentHandler
         * @desc Handler d'intent
         */
        function intentHandler() {
            if (intent.map_center) {
                G3ME.map.setView(intent.map_center, intent.map_zoom || G3ME.map.getZoom());
            }
            if (intent.map_marker) {
                Marker.get(intent.map_center, 'CONSULTATION', function () {
                    $location.path('/report/' + Site.current.id + "/" + intent.report_activity + "/" + intent.report_target);
                    $scope.$apply();
                }).addTo(G3ME.map);
            }
            if (intent.multi_report_target) {
                new MultiReport(intent);
            }
        }

        /**
         * @name dragEndHandler
         * @desc Handler de fin de drag pour arrêter ou non la fonction "Ma position"
         * @param {Event} e
         */
        function dragEndHandler(e) {
            (e.distance > 50 ? stopPosition : angular.noop)();
            clearTimeout(lastViewTimeout);
            lastViewTimeout = setTimeout(function () {
                var e = G3ME.map.getBounds();
                if (e._northEast.lat !== e._southWest.lat ||
                    e._northEast.lng !== e._southWest.lng) {
                    Storage.set('lastLeafletMape', [
                        [e._northEast.lat, e._northEast.lng],
                        [e._southWest.lat, e._southWest.lng]
                    ]);
                }
            }, 5000);
        }

        /**
         * @name controllerDestroyHandler
         * @desc Handler de destruction du scope de controller. Supprime correctement
         *       la carte du DOM pour éviter les fuites mémoires, efface les timeouts
         *       et enregister l'état de la fonction "Ma position" pour la réactiver.
         */
        function controllerDestroyHandler() {
            GPS.emptyPositionListerners();
            Storage.set('user_position_activated', POSITION_ACTIVATE);
            stopPosition();
            G3ME.map.remove();
            document.getElementById(G3ME.mapDivId).parentNode.removeChild(document.getElementById(G3ME.mapDivId));
            clearTimeout(lastViewTimeout);
        }

        /**
         * @name setReferenceView
         * @desc Repositionne la carte à la vue de référence
         */
        function setReferenceView() {
            var extent = Site.current.extent,
                southWest = L.latLng(extent.ymax, extent.xmin),
                northEast = L.latLng(extent.ymin, extent.xmax),
                bounds = L.latLngBounds(southWest, northEast);
            G3ME.map.fitBounds(bounds);
            return false;
        }

        /**
         * @name noConsultableAssets
         * @desc Callback de la consultation dans le cas ou aucun objet n'est trouvé.
         * @param {L.LatLng} coords Coordonées du click de consultation
         */
        function noConsultableAssets(coords) {
            $rootScope.$broadcast("CONSULTATION_CLICK_CANCELED");
            
            var popupContent = '<p>' + i18n.get('_MAP_ZERO_OBJECT_FOUND') + '</p>';
            if (Site.current.activities.length && $rootScope.rights.report) {
                popupContent += '<button class="btn btn-primary openLocateReportButton">'
                    + i18n.get('_CONSULTATION_REPORT_ON_POSITION') + '</button>';
                $(document).on('click', '.openLocateReportButton', function () {
                    //TODO(@gulian): utiliser un ng-click si possible
                    $rootScope.openLocatedReport(coords.lat, coords.lng);
                });
            }
            L.popup().setLatLng(coords).setContent(popupContent).openOn(G3ME.map);
            return false;
        }

        /**
         * @name mapClickHandler
         * @desc Handler de click pour la consultation
         * @param {Event} e
         */
        function mapClickHandler(e) {
            if (!consultationIsEnabled) {
                return false;
            }

            var coords = e.latlng,
                radius = 40 * 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * coords.lat) / Math.pow(2, (G3ME.map.getZoom() + 8 )),
                circle = new L.Circle(coords, radius, {
                    color: "#fc9e49",
                    weight: 1
                }).addTo(G3ME.map);

            $rootScope.$broadcast("CONSULTATION_CLICK_REQUESTED", e.latlng);

            Asset.findInBounds(coords, circle.getBounds(), function (assets) {
                if (!assets.length) {
                    noConsultableAssets(coords);
                } else {
                    $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
                }
            });

            $(circle._path).fadeOut(1500, function () {
                G3ME.map.removeLayer(circle);
            });
        }

        /**
         * @name activateConsultation
         * @desc Active la consultation
         */
        function activateConsultation() {
            stopConsultation();
            consultationIsEnabled = true;
            CONSULTATION_CONTROL = CONSULTATION_CONTROL || Utils.makeControl(i18n.get('_MAP_CONSULTATION_CONTROL'), "fa-info-circle", stopConsultation);
            G3ME.map.addControl(CONSULTATION_CONTROL);
        }

        /**
         * @name stopConsultation
         * @desc Désactive la consultation
         */
        function stopConsultation(e) {
            consultationIsEnabled = false;
            if (CONSULTATION_CONTROL && CONSULTATION_CONTROL._map) {
                G3ME.map.removeControl(CONSULTATION_CONTROL);
            }
            if (e) {
                return false;
            }
        }

        /**
         * @name activatePosition
         * @desc Active la fonction "Ma position"
         */
        function activatePosition() {

            //Zoom 18 = 30m, plus le chiffre augmente et plus le zoom est grand

            POSITION_ACTIVATE = FIRST_POSITION = true;
            //On vient de lancer le positionnement GPS et on est au-delà de 30m, on s'approche donc ...'
            if (POSITION_ZOOM == null && G3ME.map.getZoom() < 18) {
                POSITION_ZOOM = 18
            }
            //On vient de lancer le positionnement GPS et on est en dessous de 30m, on conserve le niveau de zoom ...'

            else if(POSITION_ZOOM == null && G3ME.map.getZoom() > 18){
                POSITION_ZOOM = G3ME.map.getZoom();

            }
            else if(G3ME.map.getZoom() > 18)
            {
                POSITION_ZOOM = G3ME.map.getZoom();

            }
            else if(POSITION_ZOOM < G3ME.map.getZoom){
                POSITION_ZOOM = G3ME.map.getZoom();
            }
            else{
                POSITION_ZOOM = 18;
            }
            if (LAST_USERS_LOCATION.length) {
                G3ME.map.setView(LAST_USERS_LOCATION, POSITION_ZOOM);
                G3ME.invalidateMapSize();
            }

            if (GPS.startWatchingPosition(setLocationMarker)) {
                POSITION_CONTROL = POSITION_CONTROL || Utils.makeControl(i18n.get('_MAP_MY_POSITION_CONTROL'), "fa-compass", stopPosition);
                G3ME.map.addControl(POSITION_CONTROL);
            }
        }

        /**
         * @name stopPosition
         * @desc Désactive la fonction "Ma position"
         */
        function stopPosition(e) {
            GPS.stopWatchingPosition(setLocationMarker);
            LAST_USERS_LOCATION = [];
            if (POSITION_CONTROL && POSITION_CONTROL._map) {
                G3ME.map.removeControl(POSITION_CONTROL);
            }
            if (POSITION_CIRCLE && POSITION_CIRCLE._map) {
                G3ME.map.removeLayer(POSITION_CIRCLE);
            }
            if (POSITION_MARKER && POSITION_MARKER._map) {
                G3ME.map.removeLayer(POSITION_MARKER);
            }
            POSITION_ACTIVATE = POSITION_CIRCLE = POSITION_CONTROL = POSITION_MARKER = FIRST_POSITION = POSITION_ZOOM = null;
            if (e) {
                return false;
            }
        }

        /**
         * @name setLocationMarker
         * @desc Ajoute un marker à une position sur la carte
         * @param {Number} lng Longitude
         * @param {Number} lat Latitude
         * @param {Number} alt Altitude
         * @param {Number} acc Précision
         */
        function setLocationMarker(lng, lat, alt, acc) {
            LAST_USERS_LOCATION = [lat, lng];

            if (POSITION_CIRCLE) {
                POSITION_CIRCLE.setLatLng(LAST_USERS_LOCATION).setRadius(acc);
            } else {
                POSITION_CIRCLE = new L.Circle(LAST_USERS_LOCATION, acc, {
                    color: '#fd9122',
                    opacity: 0.1,
                    fillOpacity: 0.05
                }).addTo(G3ME.map);
            }

            if (POSITION_MARKER) {
                POSITION_MARKER.setLatLng(LAST_USERS_LOCATION);
            } else {
                POSITION_MARKER = L.marker(LAST_USERS_LOCATION).setIcon(Icon.get('TARGET')).addTo(G3ME.map);
            }

            $(POSITION_CIRCLE._path).fadeOut(3000, function () {
                if (POSITION_CIRCLE) {
                    G3ME.map.removeLayer(POSITION_CIRCLE);
                    POSITION_CIRCLE = null;
                }
            });
            if (!FIRST_POSITION) {
                POSITION_ZOOM = G3ME.map.getZoom();
            }
            G3ME.map.setView(LAST_USERS_LOCATION, POSITION_ZOOM);
            FIRST_POSITION = false;
        }


        // ===================================================
        // ===================================================
        // =========== CECI DOIT DISPARAITRE AVEC LE =========
        // ============= REFACTORING DU PLANNING =============
        // ===================================================
        // ===================================================
        var missionsClusters = {},
            iconCluster = {},
            myLastPositionMarker = null,
            myPositionMarker = null,
            MarkerClusterGroupOptions = {
                showCoverageOnHover: false,
                iconCreateFunction: iconCreateFunction,
                disableClusteringAtZoom: 21,
                maxClusterRadius: 75
            }, traces;
        $scope.$on("__MAP_SETVIEW__", function (event, extent) {
            if (extent && extent.ymin && extent.xmin && extent.ymax && extent.xmax) {
                G3ME.map.fitBounds([
                    [extent.ymin, extent.xmin],
                    [extent.ymax, extent.xmax]
                ], {
                    maxZoom: 19,
                    animate: false
                });
            } else {
                alertify.error("Extent non valide");
            }
        });
        $scope.$on("__MAP_HIGHTLIGHT_MY_POSITION", function (event, lat, lng) {
            if (!myPositionMarker) {
                myPositionMarker = L.marker([lat, lng], {
                    zIndexOffset: 10000
                }).setIcon(Icon.get('TARGET')).addTo(G3ME.map);
            } else {
                myPositionMarker.setLatLng([lat, lng]);
            }
            G3ME.map.panTo([lat, lng], {
                animate: false
            });
            G3ME.invalidateMapSize();
        });
        $scope.$on("__MAP_UNHIGHTLIGHT_MY_POSITION", function () {
            if (myPositionMarker) {
                G3ME.map.removeLayer(myPositionMarker);
                myPositionMarker = null;
            }
        });
        $scope.$on("UNHIGHLIGHT_ASSETS_FOR_MISSION", function (event, mission) {
            if (missionsClusters[mission.id]) {
                G3ME.map.removeLayer(missionsClusters[mission.id]);
            }
        });

        function iconCreateFunction(cluster) {
            iconCluster[cluster._childCount] = iconCluster[cluster._childCount] || new L.DivIcon({
                    html: '<div>' + cluster._childCount + '</div>',
                    className: 'marker-cluster-assets',
                    iconSize: [40, 40]
                });
            return iconCluster[cluster._childCount];
        }

        $scope.$on("HIGHLIGHT_ASSETS_FOR_MISSION", function (event, mission, assetsCache, marker, clickHandler) {
            if (!missionsClusters[mission.id]) {
                missionsClusters[mission.id] = new L.MarkerClusterGroup(MarkerClusterGroupOptions);
            }
            for (var i = 0; i < assetsCache.length; i++) {
                if (assetsCache[i].marker) {
                    if (mission.assets.indexOf(assetsCache[i].guid) === -1 && mission.done.indexOf(assetsCache[i].guid) === -1 && mission.postAddedAssets && mission.postAddedAssets.assets.indexOf(assetsCache[i].guid) && mission.postAddedAssets && mission.postAddedAssets.done.indexOf(assetsCache[i].guid)) {
                        missionsClusters[mission.id].removeLayer("" + assetsCache[i].marker);
                        continue;
                    }
                    continue;
                }
                if (assetsCache[i].geometry.type === "LineString") {
                    assetsCache[i].geometry.coordinates = assetsCache[i].geometry.coordinates[0];
                }
                assetsCache[i].marker = L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
                if (assetsCache[i].selected) {
                    assetsCache[i].marker.setIcon(Icon.get('SELECTED_MISSION'));
                } else if (!mission.activity || mission.activity && Site.current.activities._byId[mission.activity.id].type !== "night_tour") {
                    assetsCache[i].marker.setIcon(Icon.get('NON_SELECTED_MISSION'));
                } else if (mission.activity && Site.current.activities._byId[mission.activity.id].type === "night_tour") {
                    assetsCache[i].marker.setIcon(Icon.get('NON_SELECTED_NIGHTTOUR'));
                }
                (function (i, marker) {
                    marker.on('click', function () {
                        clickHandler(mission.id, i);
                    });
                })(i, assetsCache[i].marker);
                missionsClusters[mission.id].addLayer(assetsCache[i].marker);
            }
            G3ME.map.addLayer(missionsClusters[mission.id]);
        });
        $scope.$on("UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION", function (event, mission) {
            if (missionsClusters['done-' + mission.id]) {
                G3ME.map.removeLayer(missionsClusters['done-' + mission.id]);
            }
        });
        $scope.$on("DELETEMARKERFORMISSION", function (event, mission, marker) {
            missionsClusters[mission.id].removeLayer(marker);
        });
        $scope.$on("UNHIGHLIGHT_DEPRECATED_MARKERS", function (event, missions) {
            for (var i in missionsClusters) {
                if ((!missions[i] || missions[i].assets.length === 0) && i.indexOf('done') === -1) {
                    G3ME.map.removeLayer(missionsClusters[i]);
                    if (missionsClusters['done-' + i]) {
                        G3ME.map.removeLayer(missionsClusters['done-' + i]);
                    }
                }
            }
        });
        $scope.$on("HIGHLIGHT_DONE_ASSETS_FOR_MISSION", function (event, mission, assetsCache) {
            missionsClusters['done-' + mission.id] = missionsClusters['done-' + mission.id] || new L.MarkerClusterGroup(MarkerClusterGroupOptions);
            for (var i = 0; assetsCache && i < assetsCache.length; i++) {
                assetsCache[i].marker = assetsCache[i].marker || L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
                var icon = !mission.activity || mission.activity && Site.current.activities._byId[mission.activity.id].type !== "night_tour" ? Icon.get('DONE_MISSION') : Icon.get('DONE_NIGHTTOUR');
                assetsCache[i].marker.setIcon(icon);
                missionsClusters['done-' + mission.id].addLayer(assetsCache[i].marker);
            }
            G3ME.map.addLayer(missionsClusters['done-' + mission.id]);
        });
        $scope.$on("TOGGLE_ASSET_MARKER_FOR_MISSION", function (event, asset) {
            asset.marker.setIcon(asset.selected ? Icon.get('SELECTED_MISSION') : Icon.get('NON_SELECTED_MISSION'));
        });
        $scope.$on("__MAP_HIDE_TRACE__", function (event, mission) {
            if (traces && traces[mission.id]) {
                G3ME.map.removeLayer(traces[mission.id]);
                G3ME.map.removeLayer(myLastPositionMarker);
                delete traces[mission.id];
                myLastPositionMarker = null;
            }
        });
        $scope.$on("__MAP_DISPLAY_TRACE__", function (event, mission, setView) {
            if (!mission.trace || !mission.trace.length) {
                return;
            }
            traces = traces || {};
            var geoJSON = {
                "type": "LineString",
                "coordinates": mission.trace,
                "color": "orange"
            };
            if (traces[mission.id]) {
                G3ME.map.removeLayer(traces[mission.id]);
            }
            traces[mission.id] = L.geoJson(geoJSON, {
                style: function (feature) {
                    return {
                        color: feature.geometry.color,
                        opacity: 0.9,
                        weight: 7
                    };
                }
            });
            traces[mission.id].addTo(G3ME.map);
            if (mission.trace.length) {
                var lastPosition = mission.trace[mission.trace.length - 1];
                if (!myLastPositionMarker) {
                    myLastPositionMarker = L.marker([lastPosition[1], lastPosition[0]], {
                        zIndexOffset: 1000
                    }).setIcon(Icon.get('GRAY_TARGET')).addTo(G3ME.map);
                } else {
                    myLastPositionMarker.setLatLng([lastPosition[1], lastPosition[0]]);
                }
                if (setView) {
                    G3ME.map.panTo([lastPosition[1], lastPosition[0]], {
                        animate: false
                    });
                }
            }
        });
    }
})();
