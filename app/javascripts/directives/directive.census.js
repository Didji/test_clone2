angular.module('smartgeomobile').directive("census", ['$compile', "ComplexAssetFactory", "Icon", "Smartgeo", "i18n", "$rootScope", "Storage", "G3ME", "Camera",
    function ($compile, ComplexAssetFactory, Icon, Smartgeo, i18n, $rootScope, Storage, G3ME, Camera) {

        "use strict";

        return {

            restrict: 'E',

            scope: {
                'okey': '=',
                'classindex': '=',
                'onsave': '&',
                'oncancel': '&'
            },

            templateUrl: 'partials/censusDirectiveTemplate.html',

            link: function (scope) {
                scope.mapLayers = [];
                scope.metamodel = window.SMARTGEO_CURRENT_SITE.metamodel;
                scope.dependancies = window.SMARTGEO_CURRENT_SITE.dependancies;
                scope.defaultClassIndex = scope.classindex || "0";
                scope.$watch('okey', function (okey) {
                    if (okey) {
                        window.root = scope.root = scope.node = new ComplexAssetFactory(okey);
                    }
                }, true);

                scope.cancel = function () {
                    scope.okey = undefined;
                    scope.oncancel();
                    scope.removeLayers();
                };

                scope.toggleCollapse = function (e, tab, tabs) {
                    var oldVisible = tab.visible;
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].visible = false;
                    }
                    e.preventDefault();
                    tab.visible = !!!oldVisible;
                };

                scope.removeLayers = function () {
                    for (var i = 0; i < scope.mapLayers.length; i++) {
                        G3ME.map.removeLayer(scope.mapLayers[i]);
                    }
                    scope.mapLayers = [];
                };

                scope.save = function () {
                    if (!scope.root.isGeometryOk()) {
                        alertify.alert('Veuillez remplir toutes les géometries <span ng-if="metamodel[node.okey].is_graphical" style="background-color:#d9534f" class="badge"><span class="fa fa-map-marker"></span></span>');
                        return;
                    }
                    scope.onsave();
                    scope.removeLayers();
                    scope.root.save();
                };

                scope.snap = function (node) {
                    Camera.snap(function (picture) {
                        node.photo = picture;
                        scope.$apply();
                    });
                };

                scope.userLocationGeometry = function (node) {

                    Smartgeo.getCurrentLocation(function (lng, lat) {
                        node.geometry = [lat, lng];
                        node.layer = L.marker(node.geometry, {
                            icon: L.icon({
                                iconUrl: window.SMARTGEO_CURRENT_SITE.symbology['' + node.okey + scope.defaultClassIndex].style.symbol.icon,
                                iconAnchor: [16, 16]
                            })
                        }).addTo(G3ME.map);
                        scope.mapLayers.push(node.layer);
                        scope.$apply();
                    });

                };

                scope.draw = function (node) {
                    if (window.SMARTGEO_CURRENT_SITE.metamodel[node.okey].geometry_type === "LineString") {
                        scope.drawLine(node);
                    } else {
                        scope.drawPoint(node);
                    }
                };

                scope.drawLine = function (node) {

                    function mouseClickHandler(e) {
                        var clickLatLng = [e.latlng.lat, e.latlng.lng];
                        if (!node.tmpGeometry) {
                            node.tmpGeometry = [clickLatLng];
                        } else {
                            node.tmpGeometry.push(clickLatLng);
                        }
                        if (!scope.lastPointLayer) {

                            scope.lastPointLayer = new L.Circle(clickLatLng, 15 * 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * clickLatLng[0]) / Math.pow(2, (G3ME.map.getZoom() + 8)), {
                                color: "#fc9e49",
                                weight: 1,
                                fillOpacity: 1
                            }).addTo(G3ME.map);
                            scope.lastPointLayer.on('click', function () {
                                node.geometry = angular.copy(node.tmpGeometry);
                                delete node.tmpGeometry;
                                G3ME.map.off('click', mouseClickHandler);
                                G3ME.map.removeLayer(scope.lastPointLayer);
                                delete scope.lastPointLayer;
                                scope.$apply();
                            });
                        } else {
                            scope.lastPointLayer.setLatLng(clickLatLng);
                            scope.lastPointLayer.setRadius(15 * 40075017 * Math.cos(L.LatLng.DEG_TO_RAD * clickLatLng[0]) / Math.pow(2, (G3ME.map.getZoom() + 8)));
                        }

                        if (!node.layer) {
                            var style = window.SMARTGEO_CURRENT_SITE.symbology['' + node.okey + scope.defaultClassIndex].style;
                            node.layer = L.polyline([clickLatLng], {
                                color: style.strokecolor,
                                smoothFactor: 0,
                                weight: style.width,
                                opacity: 1
                            }).addTo(G3ME.map);
                            scope.mapLayers.push(node.layer);
                        } else {
                            node.layer.addLatLng(clickLatLng);
                        }
                    }

                    node.geometry = undefined;
                    node.tmpGeometry = undefined;
                    if (node.layer) {
                        G3ME.map.removeLayer(node.layer);
                        delete node.layer;
                    }

                    G3ME.map.off('click', mouseClickHandler).on('click', mouseClickHandler);
                };

                scope.drawPoint = function (node) {

                    node.geometry = undefined;

                    function initializeNodeLayer(e) {
                        if (node.layer) {
                            return;
                        }

                        var iconUrl = window.SMARTGEO_CURRENT_SITE.symbology['' + node.okey + scope.defaultClassIndex].style.symbol.icon,
                            image = new Image();

                        image.src = iconUrl;

                        node.layer = L.marker(e.latlng, {
                            icon: L.icon({
                                iconUrl: iconUrl,
                                iconAnchor: [image.width / 2, image.height / 2]
                            })
                        }).addTo(G3ME.map);
                        scope.mapLayers.push(node.layer);
                    }

                    function resetCensusMapHandler() {
                        G3ME.map.off('click', mouseClickHandler);
                    }

                    function mouseClickHandler(e) {
                        initializeNodeLayer(e);
                        node.layer.setLatLng(e.latlng);
                        node.geometry = [e.latlng.lat, e.latlng.lng];
                        resetCensusMapHandler();
                        scope.$apply();
                    }

                    resetCensusMapHandler();

                    G3ME.map.on('click', mouseClickHandler);

                };

                scope.confirmDelete = function (node) {
                    alertify.confirm('Supprimer ' + node.fields[window.SMARTGEO_CURRENT_SITE.metamodel[node.okey].ukey] + ' ?', function (yes) {
                        if (yes) {
                            node.delete();
                            scope.$apply();
                        }
                    });
                };
            }

        };

    }
]);
