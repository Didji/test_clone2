(function() {
    "use strict";

    angular.module("smartgeomobile").filter("isGraphical", isGraphical);

    isGraphical.$inject = ["Site"];

    function isGraphical(Site) {
        /**
         * @name _isGraphical
         * @desc
         */
        function _isGraphical(layers) {
            var layersOut = [];
            for (var i = 0; i < layers.length; i++) {
                if (!!!Site.current.metamodel[layers[i].okey].is_graphical) {
                    layersOut.push(layers[i]);
                }
            }
            return layersOut;
        }
        return _isGraphical;
    }
})();
