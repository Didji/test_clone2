(function() {
    "use strict";

    angular.module("smartgeomobile").filter("urlShortener", urlShortener);

    function urlShortener() {
        /**
         * @name shortener
         * @desc Translate "http://smartgeo.fr/index.php?service=" to "smartgeo.fr"
         */
        function shortener(url) {
            return url.replace(/^https?:\/\/(.+)\/index\.php.*$/, "$1");
        }

        return shortener;
    }
})();
