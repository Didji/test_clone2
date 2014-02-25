angular.module('smartgeomobile').directive("census", ['$compile', "ComplexAssetFactory", "Icon" ,function ($compile, ComplexAssetFactory, $rootScope, Icon) {
    return {

        restrict: 'E',

        scope: {
            'okey'   : '=',
            'site'   : '=',
            'map'    : '=',
            'classindex': '=',
            'onsave'   : '&',
            'oncancel' : '&'
        },

        templateUrl: 'partials/censusDirectiveTemplate.html',

        link: function($scope, element, attrs) {

            $scope.mapLayers = [];
            $scope.defaultClassIndex =  $scope.classindex || "0" ;

            $scope.$watch('okey',function(okey){
                if(okey){
                    $scope.root = $scope.node = new ComplexAssetFactory(okey);
                }
            }, true);

            $scope.cancel = function(){
                $scope.okey = undefined ;
                $scope.oncancel();
                $scope.removeLayers();
            };

            $scope.toggleCollapse = function (e, tab, tabs) {
                var oldVisible = tab.visible ;
                for (var i = 0; i < tabs.length; i++) {
                    tabs[i].visible = false ;
                }
                e.preventDefault();
                tab.visible = !!!oldVisible;
            };

            $scope.removeLayers = function(){
                for (var i = 0; i < $scope.mapLayers.length; i++) {
                    $scope.map.removeLayer($scope.mapLayers[i]);
                }
                $scope.mapLayers = [];
            };

            $scope.save = function(){
                if(!$scope.root.isGeometryOk()){
                    alertify.alert('Veuillez remplir toutes les géometries (<span style="display: inline-block;" class="label label-danger"><span class="icon icon-map-marker"></span></span>)');
                    return;
                }
                $scope.onsave();
                $scope.root.save();
                $scope.removeLayers();
            };

            $scope.draw = function(node){
                if($scope.site.metamodel[node.okey].geometry_type === "LineString"){
                    $scope.drawLine(node);
                } else {
                    $scope.drawPoint(node);
                }
            };

            $scope.drawLine = function(node){
                node.geometry = undefined ;
                if(node.layer){
                    $scope.map.removeLayer(node.layer);
                    delete node.layer;
                }
                $scope.map.off('click').on('click',function(event){
                    var clickLatLng = [event.latlng.lat, event.latlng.lng] ;
                    if(!node.tmpGeometry){
                        node.tmpGeometry = [clickLatLng];
                    } else {
                        node.tmpGeometry.push(clickLatLng);
                    }
                    if(!node.layer) {
                        var style = $scope.site.symbology[''+node.okey+$scope.defaultClassIndex].style ;
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

                node.geometry = undefined ;
                if(!node.layer){
                    node.layer = L.marker($scope.map.getCenter(), {icon: L.icon({
                        iconUrl: $scope.site.symbology[''+node.okey+$scope.defaultClassIndex].style.symbol.icon,
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
