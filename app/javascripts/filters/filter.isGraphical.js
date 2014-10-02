(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .filter('isGraphical', isGraphical);

    function isGraphical() {
        /**
         * @name isGraphical_
         * @desc
         */
        function isGraphical_(layers) {
            var layersOut = [];
            for (var i = 0; i < layers.length; i++) {

                if (window.SMARTGEO_CURRENT_SITE.metamodel[layers[i].okey].is_graphical !== false) {
                    layersOut.push(layers[i]);
                }
            }
            return layersOut;
        }
        return isGraphical_;
    }


})();