angular.module( 'smartgeomobile' ).directive( "census", ['$compile', "ComplexAsset", "Icon", "i18n", "$rootScope", "Storage", "G3ME", "Camera", "GPS", "Site", "Project", "Utils", function($compile, ComplexAsset, Icon, i18n, $rootScope, Storage, G3ME, Camera, GPS, Site, Project, Utils) {

        "use strict";

        return {

            restrict: 'E',

            scope: {
                'asset': '=',
                'okey': '=',
                'classindex': '=',
                'onclose': '&'
            },

            templateUrl: 'partials/censusDirectiveTemplate.html',

            link: function(scope) {
                scope.metamodel = Site.current.metamodel;
                scope.lists = Site.current.lists;
                scope.dependancies = Site.current.dependancies;
                scope.defaultClassIndex = scope.classindex || "0";
                scope.$watch( watchAsset, function(asset) {
                    if (asset !== undefined) {
                        window.root = scope.root = scope.node = scope.asset;
                        scope.okey = scope.asset.okey;
                    }
                }, true );

                function watchAsset() {
                    if (scope.asset) {
                        return scope.asset.id;
                    } else {
                        return undefined;
                    }
                }

                scope.$watch( 'okey', function(okey) {

                    if (okey && !scope.asset) {
                        if (okey.search( /PROJECT_/ ) === 0) {
                            scope.isProject = true;
                            scope.defaultClassIndex = Project.currentLoadedProject.getClassIndexForAddedAsset( okey );
                            scope.root = scope.node = new ComplexAsset( okey );
                            scope.root.isProject = true;
                        } else {
                            window.root = scope.root = scope.node = new ComplexAsset( okey );
                            scope.defaultClassIndex = "0";
                            scope.root.isProject = false;
                        }
                    }
                }, true );

                scope.android = navigator.userAgent.match( /Android/i );

                scope.cancel = function() {
                    scope.okey = undefined;
                    scope.onclose();
                    scope.removeLayers();
                };

                scope.toggleCollapse = function(e, tab, tabs) {
                    var oldVisible = tab.visible;
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].visible = false;
                    }
                    e.preventDefault();
                    tab.visible = !!!oldVisible;
                };

                scope.removeLayers = function() {
                    var removeLayersChildren = function (obj) {
                        if (obj.layer) {
                            if (obj.layer.isOriented) {
                                obj.angle = obj.layer.options.angle *-1;
                            }
                            G3ME.map.removeLayer( obj.layer );
                        }
                        for (var i in obj.children) {
                            removeLayersChildren(obj.children[i]);
                        }
                    };
                    removeLayersChildren(scope.root);
                };

                scope.save = function(update) {
                    if (!scope.root.isGeometryOk()) {
                        alertify.alert( 'Veuillez remplir toutes les géometries <span ng-if="metamodel[node.okey].is_graphical" style="background-color:#d9534f" class="badge"><span class="fa fa-map-marker"></span></span>' );
                        return;
                    }
                    if (!scope.root.isFieldOk()) {
                        alertify.alert( 'Veuillez remplir tous les champs obligatoires' );
                        return;
                    }
                    scope.onclose();
                    scope.removeLayers();
                    scope.root.save( Project, update );
                }

                scope.snap = function(node) {
                    Camera.snap( function(pictureURI) {
                        Utils.getBase64ImageAsync(pictureURI, function(data) {
                            node.photo = data;
                            scope.$apply();
                        });
                    } );
                };

                scope.userLocationGeometry = function(node) {

                    GPS.getCurrentLocation( function(lng, lat) {
                        node.geometry = [lat, lng];
                        node.layer = L.marker( node.geometry, {
                            icon: L.icon( {
                                iconUrl: Site.current.symbology['' + node.okey + scope.defaultClassIndex].style.symbol.icon,

                                iconAnchor: [16, 16]
                            } )
                        } ).addTo( G3ME.map );
                        scope.$apply();
                    } );

                };

                scope.draw = function(node) {
                    $rootScope.stopConsultation();
                    switch (Site.current.metamodel[node.okey].geometry_type) {
                        case "LineString":
                            scope.drawLine( node );
                            break;
                        case "Point":
                            scope.drawPoint( node );
                            break;
                        case "Polygon":
                            scope.drawPolygon( node );
                            break;
                        default:
                            console.log("Type de géométrie non géré : "+Site.current.metamodel[node.okey].geometry_type);
                            break;
                    }
                };

                scope.drawLine = function(node) {

                    function mouseClickHandler(e) {
                        var clickLatLng = [e.latlng.lat, e.latlng.lng],
                            clickLngLat = [e.latlng.lng, e.latlng.lat];
                        if (!node.tmpGeometry) {
                            node.tmpGeometry = [clickLngLat];
                        } else {
                            node.tmpGeometry.push( clickLngLat );
                        }
                        if (!scope.lastPointLayer) {

                            scope.lastPointLayer = new L.Circle( clickLatLng, 15 * 40075017 * Math.cos( L.LatLng.DEG_TO_RAD * clickLatLng[0] ) / Math.pow( 2, (G3ME.map.getZoom() + 8 )), {
                                color: "#fc9e49",
                                weight: 1,
                                fillOpacity: 1
                            } ).addTo( G3ME.map );
                            scope.lastPointLayer.on( 'click', function() {
                                node.geometry = angular.copy( node.tmpGeometry );
                                delete node.tmpGeometry;
                                G3ME.map.off( 'click', mouseClickHandler );
                                G3ME.map.removeLayer( scope.lastPointLayer );
                                delete scope.lastPointLayer;
                                scope.$apply();
                            } );
                        } else {
                            scope.lastPointLayer.setLatLng( clickLatLng );
                            scope.lastPointLayer.setRadius( 15 * 40075017 * Math.cos( L.LatLng.DEG_TO_RAD * clickLatLng[0] ) / Math.pow( 2, (G3ME.map.getZoom() + 8 )) );
                        }

                        if (!node.layer) {
                            var style = Site.current.symbology['' + node.okey + scope.defaultClassIndex].style;
                            node.layer = L.polyline( [clickLatLng], {
                                color: style.strokecolor,
                                smoothFactor: 0,
                                weight: style.width,
                                opacity: 1
                            } ).addTo( G3ME.map );
                        } else {
                            node.layer.addLatLng( clickLatLng );
                        }
                    }

                    node.geometry = undefined;
                    node.tmpGeometry = undefined;
                    if (node.layer) {
                        G3ME.map.removeLayer( node.layer );
                        delete node.layer;
                    }

                    G3ME.map.off( 'click', mouseClickHandler ).on( 'click', mouseClickHandler );

                };

                scope.drawPolygon = function(node) {
                    delete scope.firstPointLayer;
                    function mouseClickHandler(e) {
                        var clickLatLng = [e.latlng.lat, e.latlng.lng],
                            clickLngLat = [e.latlng.lng, e.latlng.lat];
                        if (!node.tmpGeometry) {
                            node.tmpGeometry = [clickLngLat];
                        } else {
                            node.tmpGeometry.push( clickLngLat );
                        }
                        if (!scope.firstPointLayer) {

                            scope.firstPointLayer = new L.Circle( clickLatLng, 15 * 40075017 * Math.cos( L.LatLng.DEG_TO_RAD * clickLatLng[0] ) / Math.pow( 2, (G3ME.map.getZoom() + 8 )), {
                                color: "#fc9e49",
                                weight: 1,
                                fillOpacity: 1
                            } ).addTo( G3ME.map );
                            scope.firstPointLayer.on( 'click', function() {
                                node.tmpGeometry.push(node.tmpGeometry[0]);
                                if (node.tmpGeometry.length > 3) {
                                    node.geometry = angular.copy( node.tmpGeometry );
                                } else if (node.layer) {
                                    G3ME.map.removeLayer( node.layer );
                                    node.layer = undefined;
                                }
                                delete node.tmpGeometry;
                                G3ME.map.off( 'click', mouseClickHandler );
                                G3ME.map.removeLayer( scope.firstPointLayer );
                                delete scope.firstPointLayer;
                                scope.$apply();
                            } );
                        }

                        if (!node.layer) {
                            var style = Site.current.symbology['' + node.okey + scope.defaultClassIndex].style;
                            node.layer = L.polygon( [clickLatLng], {
                                color: style.strokecolor,
                                smoothFactor: 0,
                                weight: style.width,
                                opacity: 1
                            } );
                            // Attention, si on fait le addTo dans la foulée de l'initialisation,
                            // la variable node.layer n'est pas initialisée.
                            node.layer.addTo( G3ME.map );
                        } else {
                            node.layer.addLatLng( clickLatLng );
                        }
                    }

                    node.geometry = undefined;
                    node.tmpGeometry = undefined;
                    if (node.layer) {
                        G3ME.map.removeLayer( node.layer );
                        delete node.layer;
                    }

                    G3ME.map.off( 'click', mouseClickHandler ).on( 'click', mouseClickHandler );
                };

                scope.drawPoint = function(node) {

                    node.geometry = undefined;

                    function initializeNodeLayer(e) {
                        if (node.layer) {
                            return;
                        }

                        var symbology = Site.current.symbology['' + node.okey + scope.defaultClassIndex] || Site.current.symbology['' + node.okey.replace( 'PROJECT_', '' ) + scope.defaultClassIndex],
                            iconUrl = symbology.style.symbol.icon,
                            image = new Image();

                        image.src = iconUrl;
                        var options = {
                            orientationLineWeight: 10,
                            icon: L.icon( {
                                iconUrl: iconUrl,
                                iconAnchor: [image.width / 2, image.height / 2]
                            } )
                        };
                        if (Site.current.metamodel[node.okey].angle) {
                            node.layer = L.orientedMarker( e.latlng, options ).addTo( G3ME.map ).activateOrientation();
                        } else {
                            node.layer = L.marker( e.latlng, options ).addTo( G3ME.map );
                        }
                    }

                    function resetCensusMapHandler() {
                        G3ME.map.off( 'click', mouseClickHandler );
                    }

                    function mouseClickHandler(e) {
                        initializeNodeLayer( e );
                        node.layer.setLatLng( e.latlng );
                        node.geometry = [e.latlng.lat, e.latlng.lng];
                        resetCensusMapHandler();
                        scope.$apply();
                    }

                    resetCensusMapHandler();

                    G3ME.map.on( 'click', mouseClickHandler );

                };

                scope.confirmDelete = function(node) {
                    alertify.confirm( 'Supprimer ' + node.fields[Site.current.metamodel[node.okey].ukey] + ' ?', function(yes) {
                        if (yes) {
                            node.delete();
                            scope.$apply();
                        }
                    } );
                };
            }
        };
    }
] );
