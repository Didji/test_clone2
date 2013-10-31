angular.module('smartgeomobile').controller('mapController', function ($scope, $routeParams, $window, $rootScope, SQLite, G3ME, Smartgeo, $location){

    'use strict' ;

    window.site = $rootScope.site = $rootScope.site || Smartgeo.get('sites')[$routeParams.site] ;

    if(!$rootScope.site){
        alertify.alert("Aucun site n'est disponible.");
        $location.path("#");
        return false ;
    }

    $scope.consultationIsEnabled = false ;

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
        var popup = L.popup().setLatLng(coords)
                .setContent('<p>Aucun patrimoine dans cette zone.</p>')
                .openOn(G3ME.map);
        setTimeout(function() {
            $(popup._container).fadeOut();
        }, 3000);
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
            radius = 40 * mpp,
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

        request += "SELECT asset, label, geometry, CASE WHEN geometry like '%Point%' THEN 1 WHEN geometry like '%LineString%' THEN 2 END as priority FROM ASSETS WHERE (((ymin <= ? AND ymin >= ?) OR (ymax <= ? AND ymax >= ?)) ";
        request += " AND ((xmin <= ? AND xmin >= ?) OR (xmax <= ? AND xmax >= ?)) ";
        request += " OR ( xmin <=  ? AND ymin <= ? AND xmax >= ? AND ymax >= ? )) ";
        request += " order by priority LIMIT 0,10 ";
        $(circle._path).fadeOut(1500, function() {
            G3ME.map.removeLayer(circle);
        });

        SQLite.openDatabase({
            name: zone.database_name,
            bgType: 1
        }).transaction(function(t) {
            t.executeSql(request, [ymax, ymin, ymax, ymin, xmax, xmin, xmax, xmin, xmin, ymin, xmax, ymax],
                function(t, results) {
                    if (results.rows.length === 0 ) {
                        return noConsultableAssets(coords);
                    }

                    var assets = [], asset, asset_;
                    for (var i = 0; i < results.rows.length; i++) {
                        asset_ = results.rows.item(i);
                        asset  = Smartgeo.sanitizeAsset(asset_.asset);//JSON.parse(asset_.asset);
                        asset.label = asset_.label ;
                        asset.geometry = JSON.parse(asset_.geometry) ;
                        asset.priority = asset_.priority ;
                        assets.push(asset);
                    }

                    $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
                }, Smartgeo.log);
        });
        return false;
    });

    $scope.$on("ACTIVATE_CONSULTATION", function(event){
        activateConsultation();
    });

    $scope.$on("ACTIVATE_POSITION", activatePosition);

    $scope.$on("HIGHLIGHT_ASSET", function(event, asset){
        $scope.highlightAsset(asset);
    });
    $scope.$on("UNHIGHLIGHT_ASSET", function(event, asset){
        $scope.unHighlightAsset(asset);
    });
    $scope.$on("UNHIGHALLLIGHT_ASSET", function(event){
        $scope.unHighlightAllAsset();
    });
    $scope.$on("ZOOM_ON_ASSET", function(event, asset){
        $scope.zoomOnAsset(asset);
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


    //
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
            POSITION_CONTROL = makeControl("Ma position", "icon-compass", stopPosition);
        }
        G3ME.map.addControl(POSITION_CONTROL);

        if(window.SmartgeoChromium && SmartgeoChromium.locate){
            if(!window.ChromiumCallbacks){
                window.ChromiumCallbacks = [] ;
            }
            ChromiumCallbacks[0] = function(lng, lat, alt){
                setLocationMarker(null,lng, lat);
            };
            SmartgeoChromium.locate();
        } else {
            G3ME.map.on('locationfound', setLocationMarker);
            G3ME.map.locate({watch: true, setView: true});
        }

    }

    function stopPosition() {
        G3ME.map.stopLocate();
        if(POSITION_CONTROL) {
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
            CONSULTATION_CONTROL = makeControl("Consultation", "icon-info-sign", stopConsultation);
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
            default:
                console.log('Geometrie non supportée');
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
            default:
                console.log('Geometrie non supportée');
        }
        G3ME.map.setView(center,18);
        G3ME.invalidateMapSize();
    };

});
