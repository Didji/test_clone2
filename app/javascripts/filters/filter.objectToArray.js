(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .filter('object2Array', object2Array);

    function object2Array() {
        /**
         * @name object2Array_
         * @desc
         */
        function object2Array_(objects) {
            var out = [];
            for (var value in objects) {
                out.push({
                    'value': value,
                    'label': objects[value]
                });
            }
            return out;
        }
        return object2Array_;
    }

})();