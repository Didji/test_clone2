(function() {
    "use strict";

    angular.module("smartgeomobile").filter("listObjectToArray", listObjectToArray);

    listObjectToArray.$inject = ["Site"];

    function listObjectToArray(Site) {
        /**
         * @name _listObjectToArray
         * @desc
         */

        var lists = Site.current.lists;
        var listsArray = {};

        function _listObjectToArray(options) {
            var currentList;
            if (typeof options !== "string") {
                currentList = angular.copy(options);
                options = JSON.stringify(options);
            }
            if (listsArray[options]) {
                return listsArray[options];
            } else {
                currentList = currentList || lists[options];
            }
            var out = [];
            for (var value in currentList) {
                out.push({
                    value: value,
                    label: currentList[value]
                });
            }
            listsArray[options] = out;
            return out;
        }
        return _listObjectToArray;
    }
})();
