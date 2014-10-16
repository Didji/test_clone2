(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .filter('listObjectToArray', listObjectToArray);

    listObjectToArray.$inject = ["Site"];

    function listObjectToArray(Site) {
        /**
         * @name listObjectToArray_
         * @desc
         */

        var lists = Site.current.lists;
        var listsArray = {};

        function listObjectToArray_(options) {
            if (listsArray[options]) {
                return listsArray[options];
            }
            var currentList = lists[options];
            var out = [];
            for (var value in currentList) {
                out.push({
                    'value': value,
                    'label': currentList[value]
                });
            }
            listsArray[options] = out;
            return out;
        }
        return listObjectToArray_;
    }

})();