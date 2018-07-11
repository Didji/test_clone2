(function() {
    "use strict";

    angular.module("smartgeomobile").filter("filterObj", function() {
        return function(items, field, value) {
            var filtered = [];
            angular.forEach(items, function(item) {
                if (item[field] !== value) {
                    filtered.push(item);
                }
            });
            return filtered;
        };
    });
})();
