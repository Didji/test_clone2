(function() {
    "use strict";

    angular.module("smartgeomobile").filter("orderByObjects", orderByObjects);

    function orderByObjects() {
        /**
         * @name _orderByObjects
         * @desc
         */

        var filtered = [];

        function _orderByObjects(items) {
            filtered = [];
            angular.forEach(items, function(item, i) {
                filtered.push({
                    value: i,
                    label: item
                });
            });
            filtered.sort(function(a, b) {
                return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1;
            });
            return filtered;
        }
        return _orderByObjects;
    }
})();
