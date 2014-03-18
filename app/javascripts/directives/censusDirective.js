angular.module('smartgeomobile').directive("census", ['$compile', "ComplexAssetFactory", "Icon", "Smartgeo", "i18n", "$rootScope",
    function($compile, ComplexAssetFactory, Icon, Smartgeo, i18n, $rootScope) {
        return {

            restrict: 'E',

            scope: {
                'okey': '=',
                'site': '=',
                'map': '=',
                'classindex': '=',
                'onsave': '&',
                'oncancel': '&'
            },

            templateUrl: 'partials/censusDirectiveTemplate.html',

            link: function($scope, element, attrs) {

                $scope.mapLayers = [];
                $scope.defaultClassIndex = $scope.classindex || "0";

                $scope.$watch('okey', function(okey) {
                    if (okey) {
                        window.root = $scope.root = $scope.node = new ComplexAssetFactory(okey);
                    }
                }, true);

                $scope.cancel = function() {
                    $scope.okey = undefined;
                    $scope.oncancel();
                    $scope.removeLayers();
                };

                $scope.toggleCollapse = function(e, tab, tabs) {
                    var oldVisible = tab.visible;
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].visible = false;
                    }
                    e.preventDefault();
                    tab.visible = !! !oldVisible;
                };

                $scope.removeLayers = function() {
                    for (var i = 0; i < $scope.mapLayers.length; i++) {
                        $scope.map.removeLayer($scope.mapLayers[i]);
                    }
                    $scope.mapLayers = [];
                };

                $scope.save = function() {
                    if (!$scope.root.isGeometryOk()) {
                        alertify.alert('Veuillez remplir toutes les géometries <span ng-if="site.metamodel[node.okey].is_graphical" style="background-color:#d9534f" class="badge"><span class="icon icon-map-marker"></span></span>');
                        return;
                    }
                    $scope.onsave();
                    $scope.removeLayers();
                    $scope.root.save().then(function(){
                        for (var i in $scope.map._layers) {
                            $scope.map._layers[i].redraw && $scope.map._layers[i].redraw();
                        }
                    });
                };

                $scope.snapPicture = function(node) {
                    Smartgeo.snapPicture(function(picture){
                        node.photo =  picture ;
                        $scope.$apply();
                    })
                };

                $scope.userLocationGeometry = function(node) {
                    Smartgeo.getUsersLocation(function(lat, lng) {
                        node.geometry = [lat, lng];
                        node.layer = L.marker(node.geometry, {
                            icon: L.icon({
                                iconUrl: $scope.site.symbology['' + node.okey + $scope.defaultClassIndex].style.symbol.icon,
                                iconAnchor: [16, 16]
                            })
                        }).addTo($scope.map);
                        $scope.mapLayers.push(node.layer);
                        $scope.$apply();
                    }, function() {
                        alertify.error(i18n.get('_MAP_GPS_FAIL'));
                    });
                };

                $scope.draw = function(node) {
                    if ($scope.site.metamodel[node.okey].geometry_type === "LineString") {
                        $scope.drawLine(node);
                    } else {
                        $scope.drawPoint(node);
                    }
                };

                $scope.drawLine = function(node) {

                    function mouseClickHandler(e){
                        var clickLatLng = [e.latlng.lat, e.latlng.lng];
                        if (!node.tmpGeometry) {
                            node.tmpGeometry = [clickLatLng];
                        } else {
                            node.tmpGeometry.push(clickLatLng);
                        }
                        if (!$scope.lastPointLayer) {

                            $scope.lastPointLayer = new L.Circle(clickLatLng, 15 * 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * clickLatLng[0]) / Math.pow(2, ($scope.map.getZoom() + 8)), {
                                color: "#fc9e49",
                                weight: 1,
                                fillOpacity: 1
                            }).addTo($scope.map);
                            $scope.lastPointLayer.on('click', function(e) {
                                node.geometry = angular.copy(node.tmpGeometry);
                                delete node.tmpGeometry;
                                $scope.map.off('click', mouseClickHandler);
                                $scope.map.removeLayer($scope.lastPointLayer);
                                delete $scope.lastPointLayer ;
                                $scope.$apply();
                            });
                        } else {
                            $scope.lastPointLayer.setLatLng(clickLatLng);
                            $scope.lastPointLayer.setRadius(15 * 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * clickLatLng[0]) / Math.pow(2, ($scope.map.getZoom() + 8)))
                        }

                        if (!node.layer) {
                            var style = $scope.site.symbology['' + node.okey + $scope.defaultClassIndex].style;
                            node.layer = L.polyline([clickLatLng], {
                                color: style.strokecolor,
                                smoothFactor: 0,
                                weight: style.width,
                                opacity: 1
                            }).addTo($scope.map);
                            $scope.mapLayers.push(node.layer);
                        } else {
                            node.layer.addLatLng(clickLatLng);
                        }
                    }

                    node.geometry = undefined;
                    node.tmpGeometry = undefined;
                    if (node.layer) {
                        $scope.map.removeLayer(node.layer);
                        delete node.layer;
                    }

                    $scope.map.off('click', mouseClickHandler).on('click',mouseClickHandler);
                };

                $scope.drawPoint = function(node) {

                    node.geometry = undefined;

                    function initializeNodeLayer(e){
                        if (node.layer) {
                            return;
                        }
                        node.layer = L.marker(e.latlng, {
                            icon: L.icon({
                                iconUrl: $scope.site.symbology['' + node.okey + $scope.defaultClassIndex].style.symbol.icon,
                                iconAnchor: [16, 16]
                            })
                        }).addTo($scope.map);
                        $scope.mapLayers.push(node.layer);
                    }

                    function resetCensusMapHandler(){
                        $scope.map.off('mousemove', mouseMoveHandler)
                                  .off('click'    , mouseClickHandler);
                    }

                    function mouseMoveHandler(e){
                        initializeNodeLayer(e);
                        node.layer.setLatLng(e.latlng);
                    }

                    function mouseClickHandler(e){
                        initializeNodeLayer(e);
                        node.layer.setLatLng(e.latlng);
                        node.geometry = [e.latlng.lat, e.latlng.lng];
                        resetCensusMapHandler();
                        $scope.$apply();
                    }

                    resetCensusMapHandler();

                    $scope.map.on( 'mousemove', mouseMoveHandler)
                              .on( 'click'    , mouseClickHandler);

                };

                $scope.confirmDelete = function(node){
                    alertify.confirm('Supprimer '+node.fields[$scope.site.metamodel[node.okey].ukey]+' ?', function (yes) {node.delete();$scope.$apply()});
                };
            }

        };

    }
]);
