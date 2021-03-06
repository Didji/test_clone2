(function() {
    "use strict";

    angular.module("smartgeomobile").controller("MapController", MapController);

    MapController.$inject = [
        "$scope",
        "$compile",
        "$filter",
        "$rootScope",
        "G3ME",
        "Storage",
        "$location",
        "i18n",
        "Icon",
        "Asset",
        "Site",
        "GPS",
        "Installer",
        "Marker",
        "Utils",
        "Authenticator",
        "Right",
        "$route",
        "Smartgeo",
        "Intents"
    ];

    /**
     * @class MapController
     * @desc Controlleur de la cartographie.
     */
    function MapController(
        $scope,
        $compile,
        $filter,
        $rootScope,
        G3ME,
        Storage,
        $location,
        i18n,
        Icon,
        Asset,
        Site,
        GPS,
        Installer,
        Marker,
        Utils,
        Authenticator,
        Right,
        $route,
        Smartgeo,
        Intents
    ) {
        var vm = this,
            LAST_USERS_LOCATION = [],
            lastViewTimeout = 0,
            consultationIsEnabled = false,
            POSITION_ACTIVATE = false,
            CONSULTATION_CONTROL,
            POSITION_CIRCLE,
            POSITION_MARKER,
            POSITION_CONTROL,
            POSITION_ZOOM,
            FIRST_POSITION,
            intent;

        // Sur iOS, les assets sont mal chargés à l'intialisation de la map, pour pallier à ça on la charge deux fois au premier lancement
        // TODO: Faire mieux
        if (
            navigator.userAgent.match(/iP(od|hone|ad)/i) &&
            $rootScope.hasOwnProperty("justLaunched") &&
            $rootScope.justLaunched == false
        ) {
            $rootScope.justLaunched = true;
            $route.reload();
        } else {
            activate();
        }

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            $rootScope.currentPage = "Cartographie";

            Installer.checkIfDailyUpdateNeeded();

            G3ME.initialize([
                [Site.current.extent.ymin, Site.current.extent.xmin],
                [Site.current.extent.ymax, Site.current.extent.xmax]
            ])
                .on("click", mapClickHandler)
                .on("dragend", dragEndHandler)
                .addControl(
                    Utils.makeControl(i18n.get("_MAP_REFERENCE_VIEW_CONTROL"), "fa-arrows-alt", setReferenceView)
                );

            //Authenticator.silentLogin( G3ME.BackgroundTile.redraw );
            G3ME.BackgroundTile.redraw();

            ($rootScope.positionActive === true ? activatePosition : angular.noop)();
            ($rootScope.consultationActive === true ? activateConsultation : angular.noop)();

            $scope.$on("ACTIVATE_CONSULTATION", function() {
                activateConsultation();
            });

            $scope.$on("DESACTIVATE_CONSULTATION", function() {
                stopConsultation();
            });

            $scope.$on("ACTIVATE_POSITION", function() {
                activatePosition();
            });

            $scope.$on("DESACTIVATE_POSITION", function() {
                stopPosition();
            });

            $scope.$on("$destroy", controllerDestroyHandler);

            $rootScope.activatePosition = activatePosition;
            $rootScope.stopPosition = stopPosition;
            $rootScope.activateConsultation = activateConsultation;
            $rootScope.stopConsultation = stopConsultation;

            intent = Storage.get("intent");

            if ($rootScope.fromIntent == true) {
                if (intent) {
                    setTimeout(intentHandler, 0);
                } else {
                    alertify.alert(i18n.get("_INTENT_NOT_VALID_"));
                    Smartgeo._addEventListener("backbutton", Intents.end);
                }
            }
        }

        /**
         * @name intentHandler
         * @desc Handler d'intent
         */
        function intentHandler() {
            var url;
            if (intent.map_center) {
                G3ME.map.setView(intent.map_center, intent.map_zoom || G3ME.map.getZoom());
            }

            if (intent.map_marker === "true" || intent.map_marker === true) {
                Smartgeo._addEventListener("backbutton", Intents.end);
                if (Site.current.activities._byId[intent.report_activity]) {
                    Marker.get(intent.latlng || intent.map_center, "CONSULTATION", function(e) {
                        e.target._icon.src = "file:///android_asset/www/images/CONSULTATION-LOADING.gif";
                        url = "/report/" + Site.current.id + "/" + intent.report_activity + "/" + intent.report_target;
                        if (intent.report_mission) {
                            url += "/" + intent.report_mission;
                        }
                        $location.path(url);
                        $scope.$apply();
                    }).addTo(G3ME.map);
                } else {
                    alertify.alert(i18n.get("_INTENT_ACTIVITY_NOT_FOUND_"));
                    return Storage.remove("intent");
                }
            }

            if (intent.controller === "report") {
                if (intent.args === "new") {
                    Smartgeo._addEventListener("backbutton", Intents.end);
                    if (Site.current.activities._byId[intent.report_activity]) {
                        var mission_id;
                        if (intent.report_mission) {
                            mission_id = "/" + intent.report_mission;
                        } else {
                            mission_id = "";
                        }
                        $location.path(
                            "/report/" +
                                Site.current.id +
                                "/" +
                                intent.report_activity +
                                "/" +
                                (intent.report_assets.match(/,/)
                                    ? intent.report_assets.replace(",", "!")
                                    : intent.report_assets) +
                                mission_id
                        );
                        $scope.$apply();
                    } else {
                        alertify.alert(i18n.get("_INTENT_ACTIVITY_NOT_FOUND_"));
                        return Storage.remove("intent");
                    }
                } else if (intent.args === "simple") {
                    $rootScope.multireport = vm.multireport = intent;
                }
            }

            if (!$scope.$$phase) {
                $scope.$digest();
            }
            return;
        }

        /**
         * @name dragEndHandler
         * @desc Handler de fin de drag pour arrêter ou non la fonction "Ma position"
         * @param {Event} e
         */
        function dragEndHandler(e) {
            (e.distance > 50 ? stopPosition : angular.noop)();
            clearTimeout(lastViewTimeout);
            lastViewTimeout = setTimeout(function() {
                var e = G3ME.map.getBounds();
                if (e._northEast.lat !== e._southWest.lat || e._northEast.lng !== e._southWest.lng) {
                    Storage.set("lastLeafletMape", [
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
            $rootScope.positionActive = !!GPS.positionListerners.length;
            GPS.emptyPositionListerners();
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
         * @name openPopupIfNeeded
         * @desc Ouvre une popup si nécessaire après un click consultation.
         * @param {L.LatLng} coords Coordonées du click de consultation
         * @param {Array} assets
         */
        function openPopupIfNeeded(coords, assets) {
            var okey;
            var popupContent = "";

            if (!assets.length) {
                $rootScope.$broadcast("CONSULTATION_CLICK_CANCELED");
                popupContent += "<p>" + i18n.get("_MAP_ZERO_OBJECT_FOUND") + "</p>";
            }

            //On affiche le bouton CR sur XY seulement si:
            // - le droit de CR est présent et la recherche ne remonte pas d'objets
            // - on vient d'un intent qui ne soit pas un intent d'auth ('oauth')(spécifique Veolia)
            //
            // TODO: FAIRE MIEUX
            var intent = Storage.get("intent"),
                assetsForIntent = $filter("reportableAssetsForIntentFilter")(assets);
            if (
                Site.current.activities.length &&
                (($rootScope.rights.report && !assets.length) ||
                    (intent && intent.controller === "map" && !assetsForIntent.length))
            ) {
                popupContent +=
                    '<button class="btn btn-primary openLocateReportButton">' +
                    i18n.get("_CONSULTATION_REPORT_ON_POSITION") +
                    "</button>";
                $(document).on("click", ".openLocateReportButton", function() {
                    //TODO(@gulian): utiliser un ng-click si possible
                    $rootScope.openLocatedReport(coords.lat, coords.lng);
                });
            }

            okey = $rootScope.multireport && $rootScope.multireport.multi_report_activity.okeys[0];

            if (
                $rootScope.multireport &&
                !$filter("filter")(
                    assets,
                    {
                        okey: okey
                    },
                    true
                ).length
            ) {
                popupContent +=
                    '<button ng-click="$root.addLocationToTour(' +
                    coords.lat +
                    ", " +
                    coords.lng +
                    ')" class="btn btn-primary addLocationToTour">' +
                    i18n.get("_CONSULTATION_ADD_POSITION_TO_CURRENT_TOUR") +
                    "</button>";
            }

            if (popupContent.length) {
                popupContent = $compile("<div>" + popupContent + "</div>")($scope);
                L.popup()
                    .setLatLng(coords)
                    .setContent(popupContent[0])
                    .openOn(G3ME.map);
            }

            $(".leaflet-popup")
                .delay(10000)
                .fadeOut(500);
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
                radius =
                    (40 * 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * coords.lat)) / Math.pow(2, G3ME.map.getZoom() + 8),
                circle = new L.Circle(coords, radius, {
                    color: "#fc9e49",
                    weight: 1
                }).addTo(G3ME.map);

            $rootScope.$broadcast("CONSULTATION_CLICK_REQUESTED", e.latlng);

            Asset.findInBounds(coords, circle.getBounds(), function(assets) {
                openPopupIfNeeded(coords, assets);
                $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
            });

            $(circle._path).fadeOut(1500, function() {
                G3ME.map.removeLayer(circle);
            });
        }

        /**
         * @name activateConsultation
         * @desc Active la consultation
         */
        function activateConsultation() {
            stopConsultation();
            $rootScope.consultationActive = true;
            consultationIsEnabled = true;
            CONSULTATION_CONTROL =
                CONSULTATION_CONTROL ||
                Utils.makeControl(i18n.get("_MAP_CONSULTATION_CONTROL"), "fa-info-circle", stopConsultation);
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
            $rootScope.consultationActive = false;
            if (e) {
                return false;
            }
        }

        /**
         * @name activatePosition
         * @desc Active la fonction "Ma position"
         */
        function activatePosition() {
            //$rootScope.positionActive = true;
            //Zoom 18 = 30m, plus le chiffre augmente et plus le zoom est grand
            POSITION_ACTIVATE = FIRST_POSITION = true;
            //On vient de lancer le positionnement GPS et on est au-delà de 30m, on s'approche donc ...'
            if (POSITION_ZOOM == null && G3ME.map.getZoom() < 18) {
                POSITION_ZOOM = 18;
            }
            //On vient de lancer le positionnement GPS et on est en dessous de 30m, on conserve le niveau de zoom ...'
            else if (POSITION_ZOOM == null && G3ME.map.getZoom() > 18) {
                POSITION_ZOOM = G3ME.map.getZoom();
            } else if (G3ME.map.getZoom() > 18) {
                POSITION_ZOOM = G3ME.map.getZoom();
            } else if (POSITION_ZOOM < G3ME.map.getZoom) {
                POSITION_ZOOM = G3ME.map.getZoom();
            } else {
                POSITION_ZOOM = 18;
            }
            if (LAST_USERS_LOCATION.length) {
                G3ME.map.setView(LAST_USERS_LOCATION, POSITION_ZOOM);
                G3ME.invalidateMapSize();
            }

            if (GPS.startWatchingPosition(setLocationMarker)) {
                POSITION_CONTROL =
                    POSITION_CONTROL ||
                    Utils.makeControl(i18n.get("_MAP_MY_POSITION_CONTROL"), "fa-compass", stopPosition);
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
            //$rootScope.positionActive = false;
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
                    color: "#fd9122",
                    opacity: 0.1,
                    fillOpacity: 0.05
                }).addTo(G3ME.map);
            }

            if (POSITION_MARKER) {
                POSITION_MARKER.setLatLng(LAST_USERS_LOCATION);
            } else {
                POSITION_MARKER = L.marker(LAST_USERS_LOCATION)
                    .setIcon(Icon.get("TARGET"))
                    .addTo(G3ME.map);
            }

            $(POSITION_CIRCLE._path).fadeOut(3000, function() {
                if (POSITION_CIRCLE) {
                    G3ME.map.removeLayer(POSITION_CIRCLE);
                    POSITION_CIRCLE = null;
                }
            });
            if (!FIRST_POSITION) {
                POSITION_ZOOM = G3ME.map.getZoom();
                G3ME.map.panTo([lat, lng], {
                    animate: false
                });
            } else {
                G3ME.map.setView(LAST_USERS_LOCATION, POSITION_ZOOM);
            }
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
            },
            traces;
        $scope.$on("__MAP_SETVIEW__", function(event, extent) {
            if (extent && extent.ymin && extent.xmin && extent.ymax && extent.xmax) {
                G3ME.map.fitBounds([[extent.ymin, extent.xmin], [extent.ymax, extent.xmax]], {
                    maxZoom: 19,
                    animate: false
                });
            } else {
                alertify.error("Extent non valide");
            }
        });
        $scope.$on("__MAP_HIGHTLIGHT_MY_POSITION", function(event, lat, lng) {
            if (!myPositionMarker) {
                myPositionMarker = L.marker([lat, lng], {
                    zIndexOffset: 10000
                })
                    .setIcon(Icon.get("TARGET"))
                    .addTo(G3ME.map);
            } else {
                myPositionMarker.setLatLng([lat, lng]);
            }
            G3ME.map.panTo([lat, lng], {
                animate: false
            });
            G3ME.invalidateMapSize();
        });
        $scope.$on("__MAP_UNHIGHTLIGHT_MY_POSITION", function() {
            if (myPositionMarker) {
                G3ME.map.removeLayer(myPositionMarker);
                myPositionMarker = null;
            }
        });
        $scope.$on("UNHIGHLIGHT_ASSETS_FOR_MISSION", function(event, mission) {
            if (missionsClusters[mission.id]) {
                G3ME.map.removeLayer(missionsClusters[mission.id]);
            }
        });

        function iconCreateFunction(cluster) {
            iconCluster[cluster._childCount] =
                iconCluster[cluster._childCount] ||
                new L.DivIcon({
                    html: "<div>" + cluster._childCount + "</div>",
                    className: "marker-cluster-assets",
                    iconSize: [40, 40]
                });
            return iconCluster[cluster._childCount];
        }

        $scope.$on("HIGHLIGHT_ASSETS_FOR_MISSION", function(event, mission, assetsCache, marker, clickHandler) {
            missionsClusters[mission.id] =
                missionsClusters[mission.id] || new L.MarkerClusterGroup(MarkerClusterGroupOptions);

            // Création d'une liste de GUID valide sans doublon
            var guid_list = [];
            for (var i = 0; i < assetsCache.length; i++) {
                if (assetsCache[i] !== undefined && "guid" in assetsCache[i]) {
                    if (guid_list.indexOf(assetsCache[i].guid) > -1) {
                        delete assetsCache[i];
                    } else {
                        guid_list.push(assetsCache[i].guid);
                    }
                } else {
                    delete assetsCache[i];
                }
            }

            // Nettoyage des doublons dans l'assetsCache
            var newAssetsCache = [];
            for (var i = 0; i < assetsCache.length; i++) {
                if (assetsCache[i]) {
                    newAssetsCache.push(assetsCache[i]);
                }
            }
            assetsCache = newAssetsCache;

            for (var i = 0; i < assetsCache.length; i++) {
                // Initialisation de la selection à faux, notamment en cas de récupération d'une selection existante
                assetsCache[i].selected = false;
                if (assetsCache[i].marker) {
                    if (
                        mission.assets.indexOf(assetsCache[i].guid) === -1 &&
                        mission.done.indexOf(assetsCache[i].guid) === -1 &&
                        mission.postAddedAssets &&
                        mission.postAddedAssets.assets.indexOf(assetsCache[i].guid) &&
                        mission.postAddedAssets &&
                        mission.postAddedAssets.done.indexOf(assetsCache[i].guid)
                    ) {
                        missionsClusters[mission.id].removeLayer("" + assetsCache[i].marker);
                        continue;
                    }
                    //pas besoin de continuer la boucle pour cet asset
                    continue;
                }

                //Réutilisation du marker si présent
                assetsCache[i].marker =
                    assetsCache[i].marker ||
                    new L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);

                //traitement spéciale pour les LineString
                if (assetsCache[i].geometry.type === "LineString") {
                    // On selectionne le centre de la lineString.
                    // En cas de multi-lignes, il s'agit du centre surfacique
                    // TODO: Prévoir la prise en compte de chemins de câbles plus complexe
                    assetsCache[i].geometry.coordinates = [
                        (assetsCache[i]["xmax"] + assetsCache[i]["xmin"]) / 2,
                        (assetsCache[i]["ymax"] + assetsCache[i]["ymin"]) / 2
                    ];
                }

                assetsCache[i].marker = L.marker([
                    assetsCache[i].geometry.coordinates[1],
                    assetsCache[i].geometry.coordinates[0]
                ]);
                if (assetsCache[i].selected) {
                    // Si le curseur est selectionné
                    assetsCache[i].marker.setIcon(Icon.get("SELECTED_MISSION"));
                } else {
                    // si le curseur n'est pas selectionné
                    try {
                        if (Site.current.activities._byId[mission.activity.id]["type"] == "night_tour") {
                            assetsCache[i].marker.setIcon(Icon.get("NON_SELECTED_NIGHTTOUR"));
                        } else {
                            assetsCache[i].marker.setIcon(Icon.get("NON_SELECTED_MISSION"));
                        }
                    } catch (error) {
                        // En cas de TypeError, c'est que le type d'activité n'est pas définit
                        // il s'agit donc d'une activité standard.
                        assetsCache[i].marker.setIcon(Icon.get("NON_SELECTED_MISSION"));
                    }
                }
                missionsClusters[mission.id].addLayer(assetsCache[i].marker);

                (function(i, marker) {
                    marker.on("click", function() {
                        clickHandler(mission.id, i);
                    });
                })(i, assetsCache[i].marker);
                missionsClusters[mission.id].addLayer(assetsCache[i].marker);
            }
            G3ME.map.addLayer(missionsClusters[mission.id]);
        });
        $scope.$on("UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION", function(event, mission) {
            if (missionsClusters["done-" + mission.id]) {
                G3ME.map.removeLayer(missionsClusters["done-" + mission.id]);
            }
        });
        $scope.$on("DELETEMARKERFORMISSION", function(event, mission, marker) {
            missionsClusters[mission.id].removeLayer(marker);
        });
        $scope.$on("UNHIGHLIGHT_DEPRECATED_MARKERS", function(event, missions) {
            for (var i in missionsClusters) {
                if ((!missions[i] || missions[i].assets.length === 0) && i.indexOf("done") === -1) {
                    G3ME.map.removeLayer(missionsClusters[i]);
                    if (missionsClusters["done-" + i]) {
                        G3ME.map.removeLayer(missionsClusters["done-" + i]);
                    }
                }
            }
        });
        $scope.$on("HIGHLIGHT_DONE_ASSETS_FOR_MISSION", function(event, mission, assetsCache) {
            missionsClusters["done-" + mission.id] =
                missionsClusters["done-" + mission.id] ||
                new L.MarkerClusterGroup({
                    iconCreateFunction: function(cluster) {
                        return new L.DivIcon({
                            html: "<div><span>" + cluster.getChildCount() + "</span></div>",
                            className: "marker-cluster-done",
                            iconSize: new L.Point(40, 40)
                        });
                    },
                    disableClusteringAtZoom: 21,
                    maxClusterRadius: 75
                });
            for (var i = 0; assetsCache && i < assetsCache.length; i++) {
                assetsCache[i].marker =
                    assetsCache[i].marker ||
                    L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
                var icon =
                    !mission.activity ||
                    (mission.activity && Site.current.activities._byId[mission.activity.id].type !== "night_tour")
                        ? Icon.get("DONE_MISSION")
                        : Icon.get("DONE_NIGHTTOUR");
                assetsCache[i].marker.setIcon(icon);
                missionsClusters["done-" + mission.id].addLayer(assetsCache[i].marker);
            }
            G3ME.map.addLayer(missionsClusters["done-" + mission.id]);
        });
        $scope.$on("TOGGLE_ASSET_MARKER_FOR_MISSION", function(event, asset) {
            asset.marker.setIcon(asset.selected ? Icon.get("SELECTED_MISSION") : Icon.get("NON_SELECTED_MISSION"));
        });
        $scope.$on("__MAP_HIDE_TRACE__", function(event, mission) {
            if (traces && traces[mission.id]) {
                G3ME.map.removeLayer(traces[mission.id]);
                G3ME.map.removeLayer(myLastPositionMarker);
                delete traces[mission.id];
                myLastPositionMarker = null;
            }
        });

        $scope.$on("__MAP_DISPLAY_TRACE__", function(event, mission, setView) {
            if (!mission.trace || !mission.trace.length) {
                return;
            }

            traces = traces || {};
            var lastPosition = mission.trace[mission.trace.length - 1];

            if (!traces[mission.id]) {
                traces[mission.id] = new L.Polyline(mission.trace, {
                    color: "orange",
                    opacity: 0.9,
                    weight: 7
                }).addTo(G3ME.map);
            } else {
                traces[mission.id].addLatLng(lastPosition);
            }

            if (!myLastPositionMarker) {
                myLastPositionMarker = L.marker(lastPosition, {
                    zIndexOffset: 1000
                })
                    .setIcon(Icon.get("GRAY_TARGET"))
                    .addTo(G3ME.map);
            } else {
                myLastPositionMarker.setLatLng(lastPosition);
            }

            if (setView) {
                G3ME.map.panTo(lastPosition, {
                    animate: false
                });
            }
        });
    }
})();
