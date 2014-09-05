(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Marker', MarkerFactory);

    MarkerFactory.$inject = ["G3ME", "Icon"];

    /**
     * @class MarkerFactory
     * @desc Factory de la classe Marker
     *
     */

    function MarkerFactory(G3ME, Icon) {

        var Marker = {};

        Marker.getMarkerFromAsset = function(asset) {

            var marker;

            switch (asset.geometry.type) {
                case "Point":
                    var coords = asset.geometry.coordinates;
                    marker = L.marker([coords[1], coords[0]], {
                        icon: Icon.get('CONSULTATION')
                    });
                    break;
                default:
                    marker = L.geoJson(asset.geometry, {
                        style: {
                            color: '#fc9e49',
                            opacity: 0.9,
                            weight: 7
                        }
                    });
                    break;
            }

            marker.on('click', function() {
                var coords = asset.geometry.coordinates,
                    center;
                switch (asset.geometry.type) {
                    case "Point":
                        center = [coords[1], coords[0]];
                        break;
                    case "LineString":
                        center = [coords[0][1], coords[0][0]];
                        break;
                    default:
                        center = [coords[0][0][1], coords[0][0][0]];
                }
                G3ME.map.setView(center, 18);
            });

            return marker;

        }

        return Marker;
    }

})();