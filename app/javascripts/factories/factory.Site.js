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

        var Site = {};

        /**
         * @name getcurrent
         * @desc Accesseur de l'attribut current
         */
        Site.__defineGetter__("current", function () {
            if (window.SMARTGEO_CURRENT_SITE && !window.SMARTGEO_CURRENT_SITE.activities._byId) {
                window.SMARTGEO_CURRENT_SITE.activities._byId = {};
                for (var i = 0; i < window.SMARTGEO_CURRENT_SITE.activities.length; i++) {
                    window.SMARTGEO_CURRENT_SITE.activities._byId[window.SMARTGEO_CURRENT_SITE.activities[i].id] = window.SMARTGEO_CURRENT_SITE.activities[i];
                }
            }
            return window.SMARTGEO_CURRENT_SITE;
        });

        /**
         * @name setcurrent
         * @desc Modificateur de l'attribut current
         */
        Site.__defineSetter__("current", function (site) {
            window.SMARTGEO_CURRENT_SITE = site;
        });

        /**
         * @name all
         * @desc Retourne la liste des sites
         * @param {Function} callback
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
         * @name get
         * @desc Retourne un site en particulier
         * @param {String} id Identifiant du site
         */
        Site.get = function (id, setcurrent) {
            var deferred = $q.defer();
            Storage.get_('sites', function (sites) {
                if(setcurrent){
                    Site.current = sites[id] ;
                }
                deferred.resolve(sites[id]);
            });
            return deferred.promise;
        };

        return Site;
    }

})();
