angular.module('smartgeomobile').directive("census", ['$compile', "ComplexAssetFactory", "Icon" ,function ($compile, ComplexAssetFactory, $rootScope, Icon) {
    return {

        restrict: 'E',

        scope: {
            'okey'   : '=',
            'site'   : '=',
            'map'    : '=',
            'onsave' : '&'
        },

        templateUrl: 'partials/censusDirectiveTemplate.html',
        link: function($scope, element, attrs) {

            $scope.$watch('okey', function(newValue, oldValue) {
                if (newValue){
                    $scope.root = new ComplexAssetFactory(newValue);
                    window.root = $scope.node = $scope.root;
                }
            }, true);

            $scope.toggleCollapse = function (e, tab) {
                e.preventDefault();
                tab.visible = !!!tab.visible;
            };

            $scope.putOnMap = function(node){
                if($scope.site.metamodel[node.okey].geometry_type === "LineString"){
                    $scope.putLineStringOnMap(node);
                } else {
                    $scope.putPointOnMap(node);
                }
            };

            $scope.save = function(){
                $scope.onsave();
                $scope.root.save();
            };

            $scope.putLineStringOnMap = function(node){
                var classindex = 0 ;
                node.geometry = undefined ;
                $scope.map.off('click').on('click',function(event){
                    var clickLatLng = [event.latlng.lat, event.latlng.lng] ;
                    if(!node.tmpGeometry){
                        node.tmpGeometry = [clickLatLng];
                    } else {
                        node.tmpGeometry.push(clickLatLng);
                    }
                    if(!node.currentPolyline) {
                        var style = $scope.site.symbology[''+node.okey+classindex].style ;
                        node.currentPolyline = L.polyline([clickLatLng],{color: style.strokecolor, smoothFactor :0, weight:style.width, opacity:1}).addTo($scope.map);
                        node.currentPolyline.on('click', function(event){
                            node.geometry = angular.copy(node.tmpGeometry);
                            delete node.tmpGeometry;
                            $scope.map.off('click');
                            node.currentPolyline.off('click');
                            $scope.$apply();
                        });
                    } else {
                        node.currentPolyline.addLatLng(clickLatLng);
                    }
                });

            };

            $scope.putPointOnMap = function(node){

                var classindex = 0 ;
                node.geometry = undefined ;
                node.currentPointMarker = node.currentPointMarker || L.marker($scope.map.getCenter(), {icon: L.icon({
                    iconUrl: $scope.site.symbology[''+node.okey+classindex].style.symbol.icon,
                    iconAnchor: [16, 16]
                })}).addTo($scope.map);

                $scope.map.off('mousemove click').on('mousemove', function(event){
                    node.currentPointMarker.setLatLng(event.latlng);
                }).on('click',function(event){
                    node.geometry = [event.latlng.lat, event.latlng.lng] ;
                    $scope.map.off('mousemove click');
                    $scope.$apply();
                });

            };
        }


        // compile: function (el) {
        //     var contents = el.contents().remove();

        //     return function($scope,el){

        //         $compile(contents)($scope,function(clone){
        //             el.append(clone);
        //         });

        //         $scope.$watch('okey', function(newValue, oldValue) {
        //             if (newValue){
        //                 $scope.root = new ComplexAssetFactory(newValue);
        //                 window.root = $scope.node = $scope.root;
        //             }
        //         }, true);

        //         $scope.toggleCollapse = function (e, tab) {
        //             e.preventDefault();
        //             tab.visible = !!!tab.visible;
        //         };

        //         $scope.putOnMap = function(node){
        //             if($scope.site.metamodel[node.okey].geometry_type === "LineString"){
        //                 $scope.putLineStringOnMap(node);
        //             } else {
        //                 $scope.putPointOnMap(node);
        //             }
        //         };

        //         $scope.save = function(){
        //             console.log('ici') ;
        //             $scope.root.save();
        //         };

        //         $scope.putLineStringOnMap = function(node){
        //             node.geometry = undefined ;
        //             $scope.map.off('click').on('click',function(event){
        //                 var clickLatLng = [event.latlng.lat, event.latlng.lng] ;
        //                 if(!node.tmpGeometry){
        //                     node.tmpGeometry = [clickLatLng];
        //                 } else {
        //                     node.tmpGeometry.push(clickLatLng);
        //                 }
        //                 if(!node.currentPolyline) {
        //                     node.currentPolyline = L.polyline([clickLatLng]).addTo($scope.map);
        //                     node.currentPolyline.on('click', function(event){
        //                         node.geometry = angular.copy(node.tmpGeometry);
        //                         delete node.tmpGeometry;
        //                         $scope.map.off('click');
        //                         node.currentPolyline.off('click');
        //                         $scope.$apply();
        //                     });
        //                 } else {
        //                     node.currentPolyline.addLatLng(clickLatLng);
        //                 }
        //             });

        //         };

        //         $scope.putPointOnMap = function(node){

        //             var classindex = 0 ;
        //             node.geometry = undefined ;
        //             node.currentPointMarker = node.currentPointMarker || L.marker($scope.map.getCenter(), {icon: L.icon({
        //                 iconUrl: $scope.site.symbology[''+node.okey+classindex].style.symbol.icon,
        //                 iconAnchor: [16, 16]
        //             })}).addTo($scope.map);

        //             $scope.map.off('mousemove click').on('mousemove', function(event){
        //                 node.currentPointMarker.setLatLng(event.latlng);
        //             }).on('click',function(event){
        //                 node.geometry = [event.latlng.lat, event.latlng.lng] ;
        //                 $scope.map.off('mousemove click');
        //                 $scope.$apply();
        //             });

        //         };
        //     };

        // }

    };

}]);
