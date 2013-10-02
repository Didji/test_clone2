function mapController($scope, $routeParams, $window, $rootScope, SQLite, G3ME, Smartgeo){
    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;

    $scope.mapDiv = document.getElementById('smartgeo-map') ;
    $scope.mapDiv.style.height = window.innerHeight+"px";
    $scope.mapDiv.style.width  = "100%";

    $scope.leafletMap = new L.map($scope.mapDiv, {
        attributionControl: false,
        zoomControl: false
    }).addControl(L.control.zoom({
        position: 'topright'
    }));

    var tile_url = $scope.site.EXTERNAL_TILEURL;

    if(!tile_url){
        tile_url  = Smartgeo.get('url').replace(/index.php.+$/, '');
        tile_url += 'getTuileTMS.php?z={z}&x={x}&y={y}';
    }

    $scope.backgroundTile = new L.TileLayer(tile_url, {
        maxZoom: Smartgeo.MAX_ZOOM,
        minZoom: Smartgeo.MIN_ZOOM
    }).addTo($scope.leafletMap);

    $scope.canvasTile = new L.TileLayer.Canvas({
        maxZoom: Smartgeo.MAX_ZOOM,
        minZoom: Smartgeo.MIN_ZOOM
    }).addTo($scope.leafletMap);

    $scope.canvasTile.drawTile = function(canvas, tilePoint) {
        canvas.width = canvas.width;
        G3ME.drawTile($scope.leafletMap, $scope.site, canvas, tilePoint);
    };

    for(var symbol in $scope.site.symbology){
        if (!$scope.site.symbology[symbol] || !$scope.site.symbology[symbol].style) {
            continue;
        }
        var image = new Image();
        image.src = $scope.site.symbology[symbol].style.symbol.icon;
        $scope.site.symbology[symbol].style.image = image;
    }

    $scope.leafletMap.fitBounds([
        [$scope.site.extent.ymin, $scope.site.extent.xmin],
        [$scope.site.extent.ymax, $scope.site.extent.xmax]
    ]);

    setTimeout(function() {
        $scope.leafletMap.invalidateSize();
    }, 10);

    $scope.leafletMap.on('click', function(e) {

        // if (!$scope.consultationIsEnable) {
        //     return false;
        // }

        var coords = e.latlng,
            mpp = 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * coords.lat) / Math.pow(2, ($scope.leafletMap.getZoom() + 8)),
            radius = 40 * mpp,
            circle = new L.Circle(coords, radius, {
                color: "#fc9e49",
                weight: 1
            }).addTo($scope.leafletMap),
            bounds = circle.getBounds(),
            nw = bounds.getNorthWest(),
            se = bounds.getSouthEast(),
            xmin = nw.lng,
            xmax = se.lng,
            ymin = se.lat,
            ymax = nw.lat,
            zone,
            request = "";

        for (var i = 0, length_ = $scope.site.zones.length; i < length_; i++) {
            zone = $scope.site.zones[i];
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
                .openOn($scope.leafletMap);
            setTimeout(function() {
                $(popup._container).fadeOut();
            }, 3000);
            return false;
        }

        request += "SELECT * FROM ASSETS WHERE (((ymin <= ? AND ymin >= ?) OR (ymax <= ? AND ymax >= ?)) ";
        request += "AND ((xmin <= ? AND xmin >= ?) OR (xmax <= ? AND xmax >= ?)) ";
        request += "OR ( xmin <=  ? AND ymin <= ? AND xmax >= ? AND ymax >= ? )) ";

        var okeysFilter = [];

        request += "LIMIT 0,10 ";

        $(circle._path).fadeOut(1500, function() {
            $scope.leafletMap.removeLayer(circle);
        });

        SQLite.openDatabase({
            name: zone.database_name,
            bgType: 1
        }).transaction(function(t) {
            t.executeSql(request, [ymax, ymin, ymax, ymin, xmax, xmin, xmax, xmin, xmin, ymin, xmax, ymax],
                function(t, results) {
                    if (results.rows.length === 0 ) {
                        $scope.leafletMapPopup = L.popup().setLatLng(coords)
                            .setContent('<p style="color:black">Aucun patrimoine dans cette zone.</p>')
                            .openOn($scope.leafletMap);
                        setTimeout(function() {
                            $($scope.leafletMapPopup._container).fadeOut();
                        }, 3000);
                        return false;
                    }

                    var assets = [];
                    for (var i = 0; i < results.rows.length; i++) {
                        assets.push(results.rows.item(i));
                    }
                    $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);

                }, Smartgeo.log);
        });
        return false;
    }, $scope);

}

