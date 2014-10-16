(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Site', SiteFactory);

    SiteFactory.$inject = ["Storage", "$q"];


    function SiteFactory(Storage, $q) {

        /**
         * @class SiteFactory
         * @desc Factory de la classe Site
         */

        var Site = {}

        /**
         * @name current
         * @desc
         */
        Site.__defineGetter__("current", function () {
            return window.SMARTGEO_CURRENT_SITE;
        });

        /**
         * @name all
         * @desc
         */
        Site.all = function (callback) {
            var deferred = $q.defer();
            Storage.get_('sites', function (sites) {
                deferred.resolve(sites);
                (callback || function () {})(sites);
            });
            return deferred.promise;
        };

        /**
         * @name all
         * @desc
         */
        Site.get = function (id) {
            var deferred = $q.defer();
            Storage.get_('sites', function (sites) {
                deferred.resolve(sites[id]);
            });
            return deferred.promise;
        };

        return Site;
    }

})();
