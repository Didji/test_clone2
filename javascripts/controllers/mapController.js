angular.module('smartgeomobile').controller('mapController', function ($scope, $routeParams, $window, $rootScope, SQLite, G3ME, Smartgeo, $location, i18n){

    'use strict' ;

    window.site = $rootScope.site = $rootScope.site || Smartgeo.get('sites')[$routeParams.site] ;

    var SELECTED_ASSET_ICON     = L.icon({
                            iconUrl         : 'javascripts/vendors/images/marker-icon-2x-ok.png',
                            shadowUrl       : 'javascripts/vendors/images/marker-shadow.png',
                            iconSize        : [25,  41],
                            iconAnchor      : [12,  41],
                            popupAnchor     : [ 1, -34],
                            shadowSize      : [41,  41]
                        }),
        NON_SELECTED_ASSET_ICON = L.icon({
                            iconUrl         : 'javascripts/vendors/images/marker-icon.png',
                            iconRetinaUrl   : 'javascripts/vendors/images/marker-icon-2x.png',
                            shadowUrl       : 'javascripts/vendors/images/marker-shadow.png',
                            iconSize        : [25,  41],
                            iconAnchor      : [12,  41],
                            popupAnchor     : [ 1, -34],
                            shadowSize      : [41,  41]
                        }),
        DONE_ASSET_ICON     = L.icon({
                            iconUrl         : 'javascripts/vendors/images/marker-icon-done.png',
                            iconRetinaUrl   : 'javascripts/vendors/images/marker-icon-done-2x.png',
                            shadowUrl       : 'javascripts/vendors/images/marker-shadow.png',
                            iconSize        : [25,  41],
                            iconAnchor      : [12,  41],
                            popupAnchor     : [ 1, -34],
                            shadowSize      : [41,  41]
                        }),

        GRAY_TRUCK_ICON     = L.icon({
                            iconUrl         : 'javascripts/vendors/images/truck_gray.png',
                            iconSize        : [47,  40],
                            iconAnchor      : [24,  20],
                        }),
        TRUCK_ICON     = L.icon({
                            iconUrl         : 'javascripts/vendors/images/truck.png',
                            iconSize        : [47,  40],
                            iconAnchor      : [24,  20],
                        });

        $scope.missionsClusters = {};

    if(!$rootScope.site){
        alertify.alert(i18n.get("_MAP_ZERO_SITE_SELECTED"));
        $location.path("#");
        return false ;
    }

    $scope.consultationIsEnabled = false ;

    $rootScope.rights = {
        'report'   :  Smartgeo.getRight('report'),
        'goto'     :  Smartgeo.getRight('goto'),
        'planning' :  Smartgeo.getRight('planning'),
        'logout'   :  Smartgeo.getRight('logout')
    };

    Smartgeo.silentLogin(function(){
        G3ME.backgroundTile && G3ME.backgroundTile.redraw() ;
    });

    G3ME.initialize( 'smartgeo-map',
                     $rootScope.site,
                     $rootScope.map_target || Smartgeo.get('lastLeafletMapExtent') || [],
                     $rootScope.map_marker );



    G3ME.map.on('moveend', function(e) {
        var extent = G3ME.map.getBounds();
        if( extent._northEast.lat != extent._southWest.lat ||
            extent._northEast.lng != extent._southWest.lng    ){
                Smartgeo.set('lastLeafletMapExtent', [
                    [extent._northEast.lat, extent._northEast.lng],
                    [extent._southWest.lat, extent._southWest.lng]
                ]);
        }
    });



    function noConsultableAssets(coords) {
        var popupContent = '<p>'+i18n.get('_MAP_ZERO_OBJECT_FOUND')+'</p>';
        if($rootScope.report_activity){
            popupContent += '<button class="btn btn-primary openLocateReportButton">Compte rendu sur cette position</button>';
            $(document).on('click', '.openLocateReportButton' , function(){
                $location.path('report/'+$rootScope.site.id+'/'+$rootScope.report_activity+'/'+coords.lat+','+coords.lng+'/');
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
        var popup = L.popup().setLatLng(coords)
                .setContent(popupContent)
                .openOn(G3ME.map);

        if(!$rootScope.report_activity){
            setTimeout(function() {
                $(popup._container).fadeOut();
            }, 4000);
        }

        $rootScope.$broadcast("CONSULTATION_CLICK_CANCELED");
        return false;
    }


    G3ME.map.on('click', function(e) {

        if (!$scope.consultationIsEnabled) {
            return false;
        }

        $rootScope.$broadcast("CONSULTATION_CLICK_REQUESTED", e.latlng);
        var coords = e.latlng,
            mpp = 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * coords.lat) / Math.pow(2, (G3ME.map.getZoom() + 8)),
            radius_p = 40,
            radius = radius_p * mpp,
            circle = new L.Circle(coords, radius, {
                color: "#fc9e49",
                weight: 1
            }).addTo(G3ME.map),
            bounds = circle.getBounds(),
            // rect = L.rectangle(bounds, {color: "#0000ff", weight: 1}).addTo(G3ME.map),
            nw = bounds.getNorthWest(),
            se = bounds.getSouthEast(),
            xmin = nw.lng,
            xmax = se.lng,
            ymin = se.lat,
            ymax = nw.lat,
            zone,
            zoom = G3ME.map.getZoom(),
            request = "";

        for (var i = 0, length_ = $rootScope.site.zones.length; i < length_; i++) {
            zone = $rootScope.site.zones[i];
            if (G3ME.extents_match(zone.extent, {
                xmin: xmin,
                ymin: ymin,
                xmax: xmax,
                ymax: ymax
            })) {
                break;
            }
        }

        if (!zone) {
            return noConsultableAssets(coords);
        }

        request += " SELECT asset,";
        request += "       label,";
        request += "       geometry,";
        request += "       CASE WHEN geometry LIKE '%Point%' THEN 1 WHEN geometry LIKE '%LineString%' THEN 2";
        request += "       END AS priority";
        request += " FROM ASSETS ";
        request += " WHERE ";
        request += "    not ( xmax < ? or xmin > ? or ymax < ? or ymin > ?) ";
        request += "    AND ( (minzoom <= 1*? OR minzoom = 'null') AND ( maxzoom >= 1*? OR maxzoom = 'null') )";

        if(G3ME.active_layers) {
            request += G3ME.active_layers.length
                            ? ' and (symbolId like "' + G3ME.active_layers.join('%" or symbolId like "') + '%" )'
                            : ' and 1=2 ';
        }
        request +=     " order by priority LIMIT 0,100 ";


        $(circle._path).fadeOut(1500, function() {
            G3ME.map.removeLayer(circle);
        });


        SQLite.openDatabase({
            name: zone.database_name,
            bgType: 1
        }).transaction(function(t) {
            t.executeSql(request, [xmin, xmax, ymin, ymax, zoom, zoom],
                function(t, results) {
                    if (results.rows.length === 0 ) {
                        return noConsultableAssets(coords);
                    }
                    // TODO : use filter ?

                    var assets = [], asset, asset_;

                    for (var i = 0; i < results.rows.length && assets.length < 10 ; i++){
                        asset_ = results.rows.item(i);
                        asset  = Smartgeo.sanitizeAsset(asset_.asset);
                        asset.label = asset_.label ;
                        asset.geometry = JSON.parse(asset_.geometry) ;
                        asset.priority = asset_.priority ;

                        if(asset.geometry.type === "LineString"){

                            var p1 = G3ME.map.latLngToContainerPoint([coords.lng, coords.lat]),
                                p2,
                                p3,
                                distanceToCenter;

                            for (var j = 0; j < asset.geometry.coordinates.length - 1; j++) {
                                if(j){
                                    p2 = p3;
                                } else {
                                    p2 = G3ME.map.latLngToContainerPoint( asset.geometry.coordinates[j]);
                                }
                                p3 = G3ME.map.latLngToContainerPoint( asset.geometry.coordinates[j+1]);
                                distanceToCenter = L.LineUtil.pointToSegmentDistance(p1,p2,p3);

                                if(distanceToCenter <= radius_p ){
                                    assets.push(asset);
                                    break;
                                }
                            }
                        } else {
                            assets.push(asset);
                        }
                    }

                    if (assets.length === 0 ) {
                        return noConsultableAssets(coords);
                    }

                    $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
                }, Smartgeo.log);
        });
        return false;
    });


    $scope.$on("__MAP_SETVIEW__", function(event, extent){
       if(extent && extent.ymin && extent.xmin && extent.ymax && extent.xmax){
           G3ME.map.fitBounds([[extent.ymin, extent.xmin] , [extent.ymax, extent.xmax]]);
       } else {
           alertify.error("Extent non valide");
       }
    });

    $scope.$on("__MAP_HIGHTLIGHT_MY_POSITION", function(event, lat, lng){
        if(!$scope.myPositionMarker){
            $scope.myPositionMarker = L.marker([lat,lng],{zIndexOffset:10000}).setIcon(TRUCK_ICON).addTo(G3ME.map);
        } else {
            $scope.myPositionMarker.setLatLng([lat,lng]);
        }
        G3ME.map.setView([lat,lng]);
    });

    $scope.$on("__MAP_UNHIGHTLIGHT_MY_POSITION", function(){
        if($scope.myPositionMarker){
            G3ME.map.removeLayer($scope.myPositionMarker);
            delete $scope.myPositionMarker;
        }
    });

    $scope.$on("ACTIVATE_POSITION", activatePosition);

    $scope.$on("ACTIVATE_CONSULTATION", function(event){
        activateConsultation();
    });


    /*
     *   General events
     */
    $scope.$on("ZOOM_ON_ASSET", function(event, asset){
        $scope.zoomOnAsset(asset);
    });
      $scope.$on("HIGHLIGHT_ASSET", function(event, asset){
          $scope.highlightAsset(asset);
      });
      $scope.$on("UNHIGHLIGHT_ASSET", function(event, asset){
          $scope.unHighlightAsset(asset);
      });

    $scope.$on("HIGHLIGHT_ASSETS", function(event, assets, marker, clickHandler){
        for (var i = 0; i < assets.length; i++) {
            $scope.highlightAsset(assets[i], marker, clickHandler);
        }
    });
    $scope.$on("UNHIGHLIGHT_ASSETS", function(event, assets){
        for (var i = 0; i < assets.length; i++) {
            $scope.unHighlightAsset(assets[i]);
        }
    });
    $scope.$on("UNHIGHLIGHT_ALL_ASSET", function(event){
          $scope.unHighlightAllAsset();
      });

    /*
     *   Planning related events
     */
    $scope.$on("UNHIGHLIGHT_ASSETS_FOR_MISSION", function(event, mission, marker, clickHandler){
        if($scope.missionsClusters[mission.id]){
            G3ME.map.removeLayer($scope.missionsClusters[mission.id]);
        }
    });

    $scope.$on("HIGHLIGHT_ASSETS_FOR_MISSION", function(event, mission, assetsCache, marker, clickHandler){
        if(!$scope.missionsClusters[mission.id]){
            $scope.missionsClusters[mission.id] =  L.markerClusterGroup();
            for (var i = 0; i < assetsCache.length; i++) {
                assetsCache[i].marker = L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
                assetsCache[i].marker.setIcon(assetsCache[i].selected ? SELECTED_ASSET_ICON : NON_SELECTED_ASSET_ICON);
                (function(i,marker){
                    marker.on('click', function(){
                        clickHandler(mission.id, i);
                    });
                })(i, assetsCache[i].marker);
                $scope.missionsClusters[mission.id].addLayer(assetsCache[i].marker);
            }
        }
        G3ME.map.addLayer($scope.missionsClusters[mission.id]);
    });

    $scope.$on("UNHIGHLIGHT_DONE_ASSETS_FOR_MISSION", function(event, mission, marker, clickHandler){
        if($scope.missionsClusters['done-'+mission.id]){
            G3ME.map.removeLayer($scope.missionsClusters['done-'+mission.id]);
        }
    });


    $scope.$on("UNHIGHLIGHT_DEPRECATED_MARKERS", function(event, missions){
        for(var i in $scope.missionsClusters){
            if( (!missions[i] || missions[i].assets.length === 0) && i.indexOf('done') === -1){
                G3ME.map.removeLayer($scope.missionsClusters[i]);
                if($scope.missionsClusters['done-'+i]){
                    G3ME.map.removeLayer($scope.missionsClusters['done-'+i]);
                }
            }
        }
    });


    $scope.$on("HIGHLIGHT_DONE_ASSETS_FOR_MISSION", function(event, mission, assetsCache, marker, clickHandler){
        debugger;
        if(!$scope.missionsClusters['done-'+mission.id]){
            $scope.missionsClusters['done-'+mission.id] =  L.markerClusterGroup();
            for (var i = 0; i < assetsCache.length; i++) {
                assetsCache[i].marker = L.marker([assetsCache[i].geometry.coordinates[1], assetsCache[i].geometry.coordinates[0]]);
                assetsCache[i].marker.setIcon(DONE_ASSET_ICON);
                $scope.missionsClusters['done-'+mission.id].addLayer(assetsCache[i].marker);
            }
        }
        G3ME.map.addLayer($scope.missionsClusters['done-'+mission.id]);
    });

    $scope.$on("TOGGLE_ASSET_MARKER_FOR_MISSION", function(event, asset){
        asset.marker.setIcon(asset.selected ? SELECTED_ASSET_ICON : NON_SELECTED_ASSET_ICON);
    });
    $scope.$on("__MAP_HIDE_TRACE__", function(event, mission){
        if($scope.traces && $scope.traces[mission.id]){
            G3ME.map.removeLayer($scope.traces[mission.id]);
            G3ME.map.removeLayer($scope.myLastPositionMarker);
            delete $scope.traces[mission.id];
            delete $scope.myLastPositionMarker;
        }
    });
    $scope.$on("__MAP_DISPLAY_TRACE__", function(event, mission, setView){
        if(!mission.trace || !mission.trace.length){
            return ;
        }
        $scope.traces = $scope.traces || {} ;
        var geoJSON = {
            "type": "LineString",
            "coordinates": mission.trace,
            "color" : "orange"
        } ;

        if($scope.traces[mission.id]){
            G3ME.map.removeLayer($scope.traces[mission.id]);
        }
        $scope.traces[mission.id] = L.geoJson(geoJSON,{
                                        style: function (feature) {
                                            return {color: feature.geometry.color, opacity:0.9, weight: 7};
                                        }});
        $scope.traces[mission.id].addTo(G3ME.map);

        if(mission.trace.length){
            var lastPosition = mission.trace[mission.trace.length-1];
            if(!$scope.myLastPositionMarker){
                $scope.myLastPositionMarker = L.marker([lastPosition[1], lastPosition[0]],{ zIndexOffset    : 1000}).setIcon(GRAY_TRUCK_ICON).addTo(G3ME.map);
            } else {
                $scope.myLastPositionMarker.setLatLng([lastPosition[1], lastPosition[0]]);
            }
            if(setView){
                G3ME.map.setView([lastPosition[1], lastPosition[0]]);
            }
        }

    });


    // Fonction utilitaire créant un contrôle Leaflet.
    function makeControl(title, icon, onclick) {
        var Constr = L.Control.extend({
            options: {  position: 'topright' },
            onAdd: function (map) {
                var container = L.DomUtil.create('div', 'leaflet-bar');
                $(container)
                    .html('<a href="#" title="'+title+'"><span class="icon '+icon+'"></span></a>')
                    .on('click', onclick);
                return container;
            }
        });
        return new Constr();
    }

    // Gestion du mode de suivi de la position GPS.
    //
    var POSITION_MARKER,
        ANGLE_MARKER,
        POSITION_CONTROL;
    function activatePosition(event) {
        if(event){
            event.preventDefault();
        }
        stopPosition();
        if(!POSITION_CONTROL){
            POSITION_CONTROL = makeControl(i18n.get('_MAP_MY_POSITION_CONTROL'), "icon-compass", stopPosition);
        }
        G3ME.map.addControl(POSITION_CONTROL);

        if(window.SmartgeoChromium && SmartgeoChromium.locate){
            if(!window.ChromiumCallbacks){
                window.ChromiumCallbacks = [] ;
            }
            ChromiumCallbacks[0] = function(lng, lat, alt){
                setLocationMarker(null,lng, lat);
            };
            ChromiumCallbacks[2] = function(){
                alertify.error(i18n.get('_MAP_GPS_FAIL'));
            };
            SmartgeoChromium.locate();
        } else {
            G3ME.map.on('locationfound', setLocationMarker);
            G3ME.map.locate({watch: true, setView: true});
        }

    }

    function stopPosition() {
        G3ME.map.stopLocate();
        if(POSITION_CONTROL && POSITION_CONTROL._map) {
            G3ME.map.removeControl(POSITION_CONTROL);
        }
        removePositionMarker();
        return false;
    }

    function removePositionMarker() {
        if(POSITION_MARKER && POSITION_MARKER._map) {
            G3ME.map.removeLayer(POSITION_MARKER);
        }
        if(ANGLE_MARKER && ANGLE_MARKER._map) {
            G3ME.map.removeLayer(ANGLE_MARKER);
        }
    }

    function setLocationMarker(event, lng, lat) {

        if(event === null ) { /* CallbackChromium */
            event = {
                latlng : {lat: lat, lng: lng},
                accuracy : 10,
            };
            G3ME.map.setView({lat: lat, lng: lng},18);
        } else {
            G3ME.map.off('locationfound', setLocationMarker);
        }

        removePositionMarker();

        POSITION_MARKER = new L.Circle( event.latlng,
                                        event.accuracy,
                                        {
                                            clickable   : false,
                                            color       : '#fd9122',
                                            opacity     : 0.1,
                                            fillOpacity : 0.05
                                        });

        POSITION_MARKER.addTo(G3ME.map);

        $(POSITION_MARKER._path).fadeOut(1500, function() {
            G3ME.map.removeLayer(POSITION_MARKER);
        });

        if('heading' in event) {
            ANGLE_MARKER = new L.Marker(event.latlng, {icon: L.divIcon({className: 'gi-compass'})});
            ANGLE_MARKER.addTo(G3ME.map);
            ANGLE_MARKER._icon.innerHTML = '<div></div>';
            ANGLE_MARKER._icon.firstChild.style.WebkitTransform = 'rotate('+event.heading+'deg)';
        } else {
            ANGLE_MARKER = new L.Marker(event.latlng);
            ANGLE_MARKER.addTo(G3ME.map);
            $(ANGLE_MARKER._path).fadeOut(5000, function() {
                G3ME.map.removeLayer(ANGLE_MARKER);
            });
        }

    }


    //
    // Gestion de la consultation.
    //
    var CONSULTATION_CONTROL;
    function activateConsultation(event){
        if(event){
            event.preventDefault();
        }
        stopConsultation();
        $scope.consultationIsEnabled = true;
        if(!CONSULTATION_CONTROL){
            CONSULTATION_CONTROL = makeControl(i18n.get('_MAP_CONSULTATION_CONTROL'), "icon-info-sign", stopConsultation);
        }

        G3ME.map.addControl(CONSULTATION_CONTROL);
    }

    function stopConsultation() {
        $scope.consultationIsEnabled = false;
        if(CONSULTATION_CONTROL && CONSULTATION_CONTROL._map) {
            G3ME.map.removeControl(CONSULTATION_CONTROL);
        }
        return false;
    }

    $scope.highlightAsset = function(asset, customMarker, customClickHandler){

        customClickHandler = customClickHandler ||  function(){$scope.zoomOnAsset(asset);};

        if(G3ME.assetsMarkers[asset.guid]){
            G3ME.map.removeLayer(G3ME.assetsMarkers[asset.guid]);
        }

        switch (asset.geometry.type) {
            case "Point":
                var coords = asset.geometry.coordinates ;
                G3ME.assetsMarkers[asset.guid] = customMarker || L.marker([coords[1], coords[0]]);
                break;
            case "LineString":
                G3ME.assetsMarkers[asset.guid] = customMarker || L.geoJson(asset.geometry,  {
                        style : { color: '#fc9e49', opacity:0.9, weight: 7 }
                    });
                break;
            case "Polygon":
                G3ME.assetsMarkers[asset.guid] = customMarker || L.geoJson(asset.geometry,  {
                        style : { color: '#fc9e49', opacity:0.9, weight: 7 }
                    });
                break;
            default:
                Smartgeo.log(i18n.get("_G3ME_UNKNOWN_GEOMETRY", asset.geometry.type));
        }
        G3ME.assetsMarkers[asset.guid].on('click', customClickHandler);
        G3ME.assetsMarkers[asset.guid].on('dblclick', function(){
            $rootScope.$broadcast("CONSULTATION_OPEN_PANEL");
        });
        G3ME.assetsMarkers[asset.guid].addTo(G3ME.map);
        G3ME.invalidateMapSize();
    };

    $scope.unHighlightAsset = function(asset){
        if(G3ME.assetsMarkers[asset.guid]){
            G3ME.map.removeLayer(G3ME.assetsMarkers[asset.guid]);
        }
        G3ME.invalidateMapSize();
    };

    $scope.unHighlightAllAsset = function(){
        for (var i = 0; i < G3ME.assetsMarkers.length; i++) {
            if(G3ME.assetsMarkers[i]){
                G3ME.map.removeLayer(G3ME.assetsMarkers[i]);
            }
        }
        G3ME.invalidateMapSize();
    };

    $scope.zoomOnAsset = function(asset){
        var coords = asset.geometry.coordinates , center ;
        switch (asset.geometry.type) {
            case "Point":
                center = [coords[1], coords[0]] ;
                break;
            case "LineString":
                center = [coords[0][1], coords[0][0]] ;
                break;
            case "MultiLineString":
                center = [coords[0][0][1], coords[0][0][0]] ;
                break;
            case "Polygon":
                center = [coords[0][0][1], coords[0][0][0]] ;
                break;
            default:
                Smartgeo.log(i18n.get("_G3ME_UNKNOWN_GEOMETRY", asset.geometry.type));
        }
        G3ME.map.setView(center,18);
        G3ME.invalidateMapSize();
    };

});
