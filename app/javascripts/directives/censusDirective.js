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

            $scope.mapLayers = [];

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

            $scope.save = function(){
                if(!$scope.root.isGeometryOk()){
                    alertify.alert('Veuillez remplir toutes les géometries (<span style="display: inline-block;" class="label label-danger"><span class="icon icon-map-marker"></span></span>)');
                    return;
                }
                $scope.onsave();
                $scope.root.save();
                for (var i = 0; i < $scope.mapLayers.length; i++) {
                    $scope.map.removeLayer($scope.mapLayers[i]);
                }
                $scope.mapLayers = [];
            };

            $scope.draw = function(node){
                if($scope.site.metamodel[node.okey].geometry_type === "LineString"){
                    $scope.drawLine(node);
                } else {
                    $scope.drawPoint(node);
                }
            };

            $scope.drawLine = function(node){
                var classindex = 0 ;
                node.geometry = undefined ;
                $scope.map.off('click').on('click',function(event){
                    var clickLatLng = [event.latlng.lat, event.latlng.lng] ;
                    if(!node.tmpGeometry){
                        node.tmpGeometry = [clickLatLng];
                    } else {
                        node.tmpGeometry.push(clickLatLng);
                    }
                    if(!node.layer) {
                        var style = $scope.site.symbology[''+node.okey+classindex].style ;
                        node.layer = L.polyline([clickLatLng],{color: style.strokecolor, smoothFactor :0, weight:style.width, opacity:1}).addTo($scope.map);
                        node.layer.on('click', function(event){
                            node.geometry = angular.copy(node.tmpGeometry);
                            delete node.tmpGeometry;
                            $scope.map.off('click');
                            node.layer.off('click');
                            $scope.$apply();
                        });
                        $scope.mapLayers.push(node.layer);
                    } else {
                        node.layer.addLatLng(clickLatLng);
                    }
                });

            };

            $scope.drawPoint = function(node){

                var classindex = 0 ;
                node.geometry = undefined ;
                if(!node.layer){
                    node.layer = L.marker($scope.map.getCenter(), {icon: L.icon({
                        iconUrl: $scope.site.symbology[''+node.okey+classindex].style.symbol.icon,
                        iconAnchor: [16, 16]
                    })}).addTo($scope.map);
                    $scope.mapLayers.push(node.layer);
                }

                $scope.map.off('mousemove click').on('mousemove', function(event){
                    node.layer.setLatLng(event.latlng);
                }).on('click',function(event){
                    node.geometry = [event.latlng.lat, event.latlng.lng] ;
                    $scope.map.off('mousemove click');
                    $scope.$apply();
                });

            };
        }

    };

}]);
