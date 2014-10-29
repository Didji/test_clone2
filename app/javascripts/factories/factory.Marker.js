(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Marker', MarkerFactory);

    MarkerFactory.$inject = [ "Icon"];

    /**
     * @class MarkerFactory
     * @desc Factory de la classe Marker
     *
     */

    function MarkerFactory(Icon) {

        var Marker = {};

        Marker.get = function (pos, icon, clickHandler) {
            return L.marker(pos, {
                icon: Icon.get(icon)
            }).on('click', clickHandler);
        };

        Marker.getMarkerFromAsset = function (asset, clickHandler) {
            var marker;
            if (!asset.geometry) {
                return;
            }
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
            return marker.on('click', clickHandler || angular.noop);
        };

        return Marker;
    }

})();
