angular.module('smartgeomobile').controller('mapController', ["$scope", "$routeParams", "$window", "$rootScope", "SQLite", "G3ME", "Smartgeo", "$location", "i18n", "Icon", "$timeout", function ($scope, $routeParams, $window, $rootScope, SQLite, G3ME, Smartgeo, $location, i18n, Icon, $timeout) {

    'use strict';

    window.currentSite = window.currentSite || Smartgeo.get_('sites')[$routeParams.site];

    $scope.missionsClusters = {};
    $scope.DISABLE_CLUSTER_AT_ZOOM = 19;
    $scope.MAX_CLUSTER_RADIUS = 50;

    if (!window.currentSite) {
        alertify.alert(i18n.get("_MAP_ZERO_SITE_SELECTED"));
        $location.path("#");
        return false;
    }

    $scope.consultationIsEnabled = false;
    Smartgeo.silentLogin(function () {
        if (G3ME.backgroundTile) {
            G3ME.backgroundTile.redraw();
        }
    });

    G3ME.initialize('smartgeo-map',
        window.currentSite,
        $rootScope.map_target || Smartgeo.get('lastLeafletMapExtent') || [],
        $rootScope.map_marker,
        $rootScope.map_zoom || 18);



    G3ME.lastLeafletMapExtentTimeout = 0 ;
    G3ME.map.on('moveend', function (e) {
        clearTimeout(G3ME.lastLeafletMapExtentTimeout);
        G3ME.lastLeafletMapExtentTimeout = setTimeout(function(){
            var extent = G3ME.map.getBounds();
            if (extent._northEast.lat !== extent._southWest.lat ||
                extent._northEast.lng !== extent._southWest.lng) {
                Smartgeo.set('lastLeafletMapExtent', [
                    [extent._northEast.lat, extent._northEast.lng],
                    [extent._southWest.lat, extent._southWest.lng]
                ]);
            }
        }, 10000);
    });

    function noConsultableAssets(coords) {
        var popupContent = '<p>' + i18n.get('_MAP_ZERO_OBJECT_FOUND') + '</p>';
        if ($rootScope.report_activity) {
            popupContent += '<button class="btn btn-primary openLocateReportButton">Compte rendu sur cette position</button>';
            $(document).on('click', '.openLocateReportButton', function () {
                $location.path('report/' + window.currentSite.id + '/' + $rootScope.report_activity + '/' + coords.lat + ',' + coords.lng + '/');
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
        var popup = L.popup().setLatLng(coords)
            .setContent(popupContent)
            .openOn(G3ME.map);

        if (!$rootScope.report_activity) {
            setTimeout(function () {
                $(popup._container).fadeOut();
            }, 4000);
        }

        $rootScope.$broadcast("CONSULTATION_CLICK_CANCELED");
        return false;
    }


    var coords, radius_p = 40,
        baseRequest = " SELECT asset,";
    baseRequest += "       label,";
    baseRequest += "       geometry,";
    baseRequest += "       CASE WHEN geometry LIKE '%Point%' THEN 1 WHEN geometry LIKE '%LineString%' THEN 2";
    baseRequest += "       END AS priority";
    baseRequest += " FROM ASSETS ";
    baseRequest += " WHERE ";
    baseRequest += "    not ( xmax < ? or xmin > ? or ymax < ? or ymin > ?) ";
    baseRequest += "    AND ( (minzoom <= 1*? OR minzoom = 'null') AND ( maxzoom >= 1*? OR maxzoom = 'null') )";

    G3ME.map.on('click', function (e) {

        if (!$scope.consultationIsEnabled) {
            return false;
        }

        $rootScope.$broadcast("CONSULTATION_CLICK_REQUESTED", e.latlng);
        coords = e.latlng;
        var mpp = 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * coords.lat) / Math.pow(2, (G3ME.map.getZoom() + 8)),
            radius = radius_p * mpp,
            circle = new L.Circle(coords, radius, {
                color: "#fc9e49",
                weight: 1
            }).addTo(G3ME.map),
            bounds = circle.getBounds(),
            nw = bounds.getNorthWest(),
            se = bounds.getSouthEast(),
            xmin = nw.lng,
            xmax = se.lng,
            ymin = se.lat,
            ymax = nw.lat,
            zone,
            zoom = G3ME.map.getZoom(),
            request = baseRequest;

        $(circle._path).fadeOut(1500, function () {
            G3ME.map.removeLayer(circle);
        });

        for (var i = 0, length_ = window.currentSite.zones.length; i < length_; i++) {
            zone = window.currentSite.zones[i];
            if (G3ME.extents_match(zone.extent, {
                xmin: xmin,
                ymin: ymin,
                xmax: xmax,
                ymax: ymax
            })) {
                break;
            }
        }

        if (!zone || (G3ME.active_layers && !G3ME.active_layers.length) ) {
            return noConsultableAssets(coords);
        }

        if (G3ME.active_layers) {
            request += ' and (symbolId REGEXP "^('+G3ME.active_layers.join('|')+')[0-9]+" )' ;
        }
        request += " order by priority LIMIT 0,100 ";

        SQLite.openDatabase({
            name: zone.database_name,
            bgType: 1
        }).transaction(function (t) {
            t.executeSql(request, [xmin, xmax, ymin, ymax, zoom, zoom],  sendResultsToConsultation, Smartgeo.log);
        });
        return false;
    });

    function sendResultsToConsultation(t, results) {

        var numRows = results.rows.length;

        if (numRows === 0) {
            return noConsultableAssets(coords);
        }

        var assets = [],
            asset, asset_;

        for (var i = 0; i < numRows && assets.length < 10; i++) {
            asset_ = results.rows.item(i);
            asset = Smartgeo.sanitizeAsset(asset_.asset);
            asset.label =  asset_.label.replace(/&#039;/g, "'").replace(/\\\\/g, "\\");
            asset.geometry = JSON.parse(asset_.geometry);
            asset.priority = asset_.priority;
            if (asset.geometry.type === "LineString") {

                var p1 = G3ME.map.latLngToContainerPoint([coords.lng, coords.lat]),
                    p2,
                    p3,
                    distanceToCenter;

                for (var j = 0, length_ = asset.geometry.coordinates.length; j < (length_ - 1); j++) {
                    if (j) {
                        p2 = p3;
                    } else {
                        p2 = G3ME.map.latLngToContainerPoint(asset.geometry.coordinates[j]);
                    }
                    p3 = G3ME.map.latLngToContainerPoint(asset.geometry.coordinates[j + 1]);
                    distanceToCenter = L.LineUtil.pointToSegmentDistance(p1, p2, p3);

                    if (distanceToCenter <= radius_p) {
                        assets.push(asset);
                        break;
                    }
                }
            } else {
                assets.push(asset);
            }
        }

        if (assets.length === 0) {
            return noConsultableAssets(coords);
        }

        $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
    }

    $scope.$on("__MAP_SETVIEW__", function (event, extent) {
        if (extent && extent.ymin && extent.xmin && extent.ymax && extent.xmax) {
            G3ME.map.fitBounds([
                [extent.ymin, extent.xmin],
                [extent.ymax, extent.xmax]
            ]);
        } else {
            alertify.error("Extent non valide");
        }
    });

    $scope.$on("__MAP_HIGHTLIGHT_MY_POSITION", function (event, lat, lng) {
        if (!$scope.myPositionMarker) {
            $scope.myPositionMarker = L.marker([lat, lng], {
                zIndexOffset: 10000
            }).setIcon(Icon.get('TARGET')).addTo(G3ME.map);
        } else {
            $scope.myPositionMarker.setLatLng([lat, lng]);
        }
        G3ME.map.panTo([lat, lng],{animate:false});
        G3ME.invalidateMapSize();
    });

    $scope.$on("__MAP_UNHIGHTLIGHT_MY_POSITION", function () {
        if ($scope.myPositionMarker) {
            G3ME.map.removeLayer($scope.myPositionMarker);
            delete $scope.myPositionMarker;
        }
    });


    $scope.$on("ACTIVATE_CONSULTATION", function (event) {
        activateConsultation();
    });


    /*
     *   General events
     */
    $scope.$on("ZOOM_ON_ASSET", function (event, asset) {
        $scope.zoomOnAsset(asset);
    });
    $scope.$on("HIGHLIGHT_ASSET", function (event, asset) {
        $scope.highlightAsset(asset);
    });
    $scope.$on("UNHIGHLIGHT_ASSET", function (event, asset) {
        $scope.unHighlightAsset(asset);
    });

    $scope.$on("HIGHLIGHT_ASSETS", function (event, assets, marker, clickHandler) {
        for (var i = 0; i < assets.length; i++) {
            $scope.highlightAsset(assets[i], marker, clickHandler);
        }
    });
    $scope.$on("UNHIGHLIGHT_ASSETS", function (event, assets) {
        for (var i = 0; i < assets.length; i++) {
            $scope.unHighlightAsset(assets[i]);
        }
    });
    $scope.$on("UNHIGHLIGHT_ALL_ASSET", function (event) {
        $scope.unHighlightAllAsset();
    });

    /*
     *   Planning related events
     */
    $scope.$on("UNHIGHLIGHT_ASSETS_FOR_MISSION", function (event, mission, marker, clickHandler) {
        if ($scope.missionsClusters[mission.id]) {
            G3ME.map.removeLayer($scope.missionsClusters[mission.id]);
        }
    });

    $scope.$on("HIGHLIGHT_ASSETS_FOR_MISSION", function (event, mission, assetsCache, marker, clickHandler) {
        if (!$scope.missionsClusters[mission.id]) {
            $scope.missionsClusters[mission.id] = new L.MarkerClusterGroup({
                iconCreateFunction: function (cluster) {
                    return new L.DivIcon({
                        html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                        className: 'marker-cluster-assets',
                        iconSize: new L.Point(40, 40)
                    });
                },
                disableClusteringAtZoom: $scope.DISABLE_CLUSTER_AT_ZOOM,
                maxClusterRadius: $scope.MAX_CLUSTER_RADIUS
            });
        }
        for (var i = 0; i < assetsCache.length; i++) {
            if (assetsCache[i].marker) {
                if(     mission.assets.indexOf(assetsCache[i].guid) === -1
                    &&  mission.done.indexOf(assetsCache[i].guid) === -1
                    &&  mission.postAddedAssets.assets.indexOf(assetsCache[i].guid)
                    &&  mission.postAddedAssets.done.indexOf(assetsCache[i].guid)
                    ){
                    $scope.missionsClusters[mission.id].removeLayer(assetsCache[i].marker);
                    continue;
                }
                continue;
            }
            if(assetsCache[i].geometry.type === "LineString"){
                assetsCache[i].geometry.coordinates = assetsCache[i].geometry.coordinates[0];
            }
            console.log(assetsCache[i].geometry)
            assetsCache[i].marker = L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
            var icon = assetsCache[i].selected ? Icon.get('SELECTED_MISSION') : !mission.activity || mission.activity && window.currentSite.activities._byId[mission.activity.id].type !== "night_tour" ? Icon.get('NON_SELECTED_MISSION') : Icon.get('NON_SELECTED_NIGHTTOUR');
            assetsCache[i].marker.setIcon(icon);
            (function (i, marker) {
                marker.on('click', function () {
                    clickHandler(mission.id, i);
                });
            })(i, assetsCache[i].marker);
            $scope.missionsClusters[mission.id].addLayer(assetsCache[i].marker);
        }
        G3ME.map.addLayer($scope.missionsClusters[mission.id]);
    });

    $scope.$on("UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION", function (event, mission, marker, clickHandler) {
        if ($scope.missionsClusters['done-' + mission.id]) {
            G3ME.map.removeLayer($scope.missionsClusters['done-' + mission.id]);
        }
    });


    $scope.$on("UNHIGHLIGHT_DEPRECATED_MARKERS", function (event, missions) {
        for (var i in $scope.missionsClusters) {
            if ((!missions[i] || missions[i].assets.length === 0) && i.indexOf('done') === -1) {
                G3ME.map.removeLayer($scope.missionsClusters[i]);
                if ($scope.missionsClusters['done-' + i]) {
                    G3ME.map.removeLayer($scope.missionsClusters['done-' + i]);
                }
            }
        }
    });


    $scope.$on("HIGHLIGHT_DONE_ASSETS_FOR_MISSION", function (event, mission, assetsCache, marker, clickHandler) {
        $scope.missionsClusters['done-' + mission.id] = $scope.missionsClusters['done-' + mission.id] || new L.MarkerClusterGroup({
            iconCreateFunction: function (cluster) {
                return new L.DivIcon({
                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                    className: 'marker-cluster-done',
                    iconSize: new L.Point(40, 40)
                });
            },
            disableClusteringAtZoom: $scope.DISABLE_CLUSTER_AT_ZOOM,
            maxClusterRadius: $scope.MAX_CLUSTER_RADIUS
        });
        for (var i = 0; assetsCache && i < assetsCache.length; i++) {
            assetsCache[i].marker = assetsCache[i].marker || L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
            var icon = !mission.activity || mission.activity && window.currentSite.activities._byId[mission.activity.id].type !== "night_tour" ? Icon.get('DONE_MISSION') : Icon.get('DONE_NIGHTTOUR');
            assetsCache[i].marker.setIcon(icon);
            $scope.missionsClusters['done-' + mission.id].addLayer(assetsCache[i].marker);
        }
        G3ME.map.addLayer($scope.missionsClusters['done-' + mission.id]);
    });

    $scope.$on("TOGGLE_ASSET_MARKER_FOR_MISSION", function (event, asset) {
        asset.marker.setIcon(asset.selected ? Icon.get('SELECTED_MISSION') : Icon.get('NON_SELECTED_MISSION'));
    });
    $scope.$on("__MAP_HIDE_TRACE__", function (event, mission) {
        if ($scope.traces && $scope.traces[mission.id]) {
            G3ME.map.removeLayer($scope.traces[mission.id]);
            G3ME.map.removeLayer($scope.myLastPositionMarker);
            delete $scope.traces[mission.id];
            delete $scope.myLastPositionMarker;
        }
    });
    $scope.$on("__MAP_DISPLAY_TRACE__", function (event, mission, setView) {
        if (!mission.trace || !mission.trace.length) {
            return;
        }
        $scope.traces = $scope.traces ||  {};
        var geoJSON = {
            "type": "LineString",
            "coordinates": mission.trace,
            "color": "orange"
        };

        if ($scope.traces[mission.id]) {
            G3ME.map.removeLayer($scope.traces[mission.id]);
        }
        $scope.traces[mission.id] = L.geoJson(geoJSON, {
            style: function (feature) {
                return {
                    color: feature.geometry.color,
                    opacity: 0.9,
                    weight: 7
                };
            }
        });
        $scope.traces[mission.id].addTo(G3ME.map);

        if (mission.trace.length) {
            var lastPosition = mission.trace[mission.trace.length - 1];
            if (!$scope.myLastPositionMarker) {
                $scope.myLastPositionMarker = L.marker([lastPosition[1], lastPosition[0]], {
                    zIndexOffset: 1000
                }).setIcon(Icon.get('GRAY_TARGET')).addTo(G3ME.map);
            } else {
                $scope.myLastPositionMarker.setLatLng([lastPosition[1], lastPosition[0]]);
            }
            if (setView) {
                G3ME.map.panTo([lastPosition[1], lastPosition[0]], {animate:false});
            }
        }

    });


    // Fonction utilitaire créant un contrôle Leaflet.
    function makeControl(title, icon, onclick) {
        var Constr = L.Control.extend({
            options: {
                position: 'topright'
            },
            onAdd: function (map) {
                var container = L.DomUtil.create('div', 'leaflet-bar');
                $(container)
                    .html('<a href="#" title="' + title + '"><span class="icon ' + icon + '"></span></a>')
                    .on('click', onclick);
                return container;
            }
        });
        return new Constr();
    }
  /*
    *
    * Gestion du mode de suivi de la position GPS.
    *
    */

    var POSITION_CIRCLE, POSITION_MARKER, POSITION_CONTROL;

    $scope.$on("ACTIVATE_POSITION", function (){
        if (Smartgeo.startWatchingPosition(setLocationMarker)) {
            POSITION_CONTROL = makeControl(i18n.get('_MAP_MY_POSITION_CONTROL'), "icon-compass", stopPosition);
            G3ME.map.addControl(POSITION_CONTROL);
        }
    });

    function stopPosition(event) {

        Smartgeo.stopWatchingPosition(setLocationMarker);

        if (POSITION_CONTROL && POSITION_CONTROL._map) {
            G3ME.map.removeControl(POSITION_CONTROL);
        }
        if (POSITION_CIRCLE && POSITION_CIRCLE._map) {
            G3ME.map.removeLayer(POSITION_CIRCLE);
        }
        if (POSITION_MARKER && POSITION_MARKER._map) {
            G3ME.map.removeLayer(POSITION_MARKER);
        }

        POSITION_CIRCLE = POSITION_CONTROL = POSITION_MARKER = null ;

        return false;
    }

    function setLocationMarker(lng, lat, alt, acc) {

        G3ME.map.panTo([lat, lng], POSITION_MARKER ? G3ME.map.getZoom() : 18 );

        if(POSITION_CIRCLE){
            POSITION_CIRCLE.setLatLng([lat, lng]).setRadius(acc);
        } else {
            POSITION_CIRCLE = new L.Circle([lat, lng], acc, {
                color: '#fd9122',
                opacity: 0.1,
                fillOpacity: 0.05
            }).addTo(G3ME.map);
        }

        if(POSITION_MARKER){
            POSITION_MARKER.setLatLng([lat, lng]);
        } else {
            POSITION_MARKER = L.marker([lat, lng]).setIcon(Icon.get('TARGET')).addTo(G3ME.map);
        }

        $(POSITION_CIRCLE._path).fadeOut(3000, function () {
            if(POSITION_CIRCLE){
                G3ME.map.removeLayer(POSITION_CIRCLE);
                POSITION_CIRCLE = null ;
            }
        });

    }

    //
    // Gestion de la consultation.
    //
    var CONSULTATION_CONTROL;

    function activateConsultation(event) {
        if (event) {
            event.preventDefault();
        }
        stopConsultation();
        $scope.consultationIsEnabled = true;
        if (!CONSULTATION_CONTROL) {
            CONSULTATION_CONTROL = makeControl(i18n.get('_MAP_CONSULTATION_CONTROL'), "icon-info-sign", stopConsultation);
        }

        G3ME.map.addControl(CONSULTATION_CONTROL);
    }

    function stopConsultation() {
        $scope.consultationIsEnabled = false;
        if (CONSULTATION_CONTROL && CONSULTATION_CONTROL._map) {
            G3ME.map.removeControl(CONSULTATION_CONTROL);
        }
        return false;
    }

    $rootScope.stopConsultation = stopConsultation;

    $scope.highlightAsset = function (asset, customMarker, customClickHandler) {
        customClickHandler = customClickHandler || function () {
            $scope.zoomOnAsset(asset);
        };

        if (G3ME.assetsMarkers[asset.guid]) {
            G3ME.map.removeLayer(G3ME.assetsMarkers[asset.guid]);
        }

        switch (asset.geometry.type) {
        case "Point":
            var coords = asset.geometry.coordinates;
            G3ME.assetsMarkers[asset.guid] = customMarker || L.marker([coords[1], coords[0]], {
                icon: Icon.get('CONSULTATION')
            });
            break;
        case "LineString":
            G3ME.assetsMarkers[asset.guid] = customMarker || L.geoJson(asset.geometry, {
                style: {
                    color: '#fc9e49',
                    opacity: 0.9,
                    weight: 7
                }
            });
            break;
        case "Polygon":
            G3ME.assetsMarkers[asset.guid] = customMarker || L.geoJson(asset.geometry, {
                style: {
                    color: '#fc9e49',
                    opacity: 0.9,
                    weight: 7
                }
            });
            break;
        default:
            Smartgeo.log(i18n.get("_G3ME_UNKNOWN_GEOMETRY", asset.geometry.type));
        }
        G3ME.assetsMarkers[asset.guid].on('click', customClickHandler);
        G3ME.assetsMarkers[asset.guid].on('dblclick', function () {
            $rootScope.$broadcast("CONSULTATION_OPEN_PANEL");
        });
        G3ME.assetsMarkers[asset.guid].addTo(G3ME.map);
        G3ME.invalidateMapSize();
    };

    $scope.unHighlightAsset = function (asset) {
        if (G3ME.assetsMarkers[asset.guid]) {
            G3ME.map.removeLayer(G3ME.assetsMarkers[asset.guid]);
        }
        G3ME.invalidateMapSize();
    };

    $scope.unHighlightAllAsset = function () {
        for (var i = 0; i < G3ME.assetsMarkers.length; i++) {
            if (G3ME.assetsMarkers[i]) {
                G3ME.map.removeLayer(G3ME.assetsMarkers[i]);
            }
        }
        G3ME.invalidateMapSize();
    };

    $scope.zoomOnAsset = function (asset) {
        var coords = asset.geometry.coordinates,
            center;
        switch (asset.geometry.type) {
        case "Point":
            center = [coords[1], coords[0]];
            break;
        case "LineString":
            center = [coords[0][1], coords[0][0]];
            break;
        case "MultiLineString":
            center = [coords[0][0][1], coords[0][0][0]];
            break;
        case "Polygon":
            center = [coords[0][0][1], coords[0][0][0]];
            break;
        default:
            Smartgeo.log(i18n.get("_G3ME_UNKNOWN_GEOMETRY", asset.geometry.type));
        }
        G3ME.map.setView(center, 18);
        G3ME.invalidateMapSize();
    };

}]);
