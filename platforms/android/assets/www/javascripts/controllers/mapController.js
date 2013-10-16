function mapController($scope, $routeParams, $window, $rootScope, SQLite, G3ME, Smartgeo){

    window.site = $rootScope.site = $rootScope.site || Smartgeo.get('sites')[$routeParams.site] ;

    $scope.consultationIsEnabled = false ;

    var extent = Smartgeo.get('lastLeafletMapExtent') || [] ;

    G3ME.initialize('smartgeo-map', $rootScope.site, extent.length ? extent : null);

    G3ME.map.on('moveend', function(e) {
        var extent = G3ME.map.getBounds();
        if(    extent._northEast.lat != extent._southWest.lat
            || extent._northEast.lng != extent._southWest.lng ){
                Smartgeo.set('lastLeafletMapExtent', [
                    [extent._northEast.lat, extent._northEast.lng],
                    [extent._southWest.lat, extent._southWest.lng]
                ]);
        }
    });

    G3ME.map.on('click', function(e) {

        if (!$scope.consultationIsEnabled) {
            return false;
        }

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
            var popup = L.popup().setLatLng(coords)
                .setContent('<p>Aucun patrimoine dans cette zone.</p>')
                .openOn(G3ME.map);
            setTimeout(function() {
                $(popup._container).fadeOut();
            }, 3000);
            return false;
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
                        var mapPopup = L.popup().setLatLng(coords)
                            .setContent('<p style="color:black">Aucun patrimoine dans cette zone.</p>')
                            .openOn(G3ME.map);
                        setTimeout(function() {
                            $(mapPopup._container).fadeOut();
                        }, 3000);
                        return false;
                    }

                    var assets = [], asset, asset_;
                    for (var i = 0; i < results.rows.length; i++) {
                        asset_ = results.rows.item(i);
                        asset  = JSON.parse(asset_.asset);
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

    $scope.$on("TOGGLE_CONSULTATION", function(event){
        $scope.toggleConsultation();
    });
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

    $scope.toggleConsultation = function (event){
        if(event){
            event.preventDefault();
        }
        $scope.consultationIsEnabled = !$scope.consultationIsEnabled;
        if(!$scope.consultationIndicatorCustomControl){
            $scope.consultationIndicatorCustomControl = L.Control.extend({
                options: {  position: 'topright' },
                onAdd: function (map) {
                    var container = L.DomUtil.create('div', 'leaflet-bar');
                    $(container)
                        .html('<a href="#" ng-click="toggleConsultation($event)" title="Consultation"><span class="icon icon-info-sign"></span></a>')
                        .on('click',$scope.toggleConsultation);
                    return container;
                }
            });
            $scope.consultationIndicatorCustomControl = new $scope.consultationIndicatorCustomControl();
        }

        if($scope.consultationIsEnabled){
            G3ME.map.addControl($scope.consultationIndicatorCustomControl);
        } else {
            G3ME.map.removeControl($scope.consultationIndicatorCustomControl);
        }
    };

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

}
