(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .filter('orderListAlpha', orderListAlpha);

    function orderListAlpha() {

        /**
         * @name order
         * @desc Tri un list alphabetiquement avec l'attribut passé en parametre
         */
        function order(list, attribute) {
            return list.sort(function (a, b) {
                return (a[attribute] < b[attribute] ? -1 : (a[attribute] > b[attribute] ? 1 : 0));
            });
        }
        return order;
    }

})();