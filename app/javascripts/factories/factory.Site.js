(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Site', SiteFactory);

    SiteFactory.$inject = ["$q"];


    function SiteFactory($q) {

        /**
         * @class SiteFactory
         * @desc Factory de la classe Site
         */

        var Site = {}

        /**
         * @name setCurrent
         * @desc
         */
        Site.setCurrent = function(id) {
            if(window.SMARTGEO_CURRENT_SITE){
                return window.SMARTGEO_CURRENT_SITE;
            } else if(id){
                return (window.SMARTGEO_CURRENT_SITE = window.SMARTGEO_CURRENT_SITE = window.SMARTGEO_CURRENT_SITE || Smartgeo.get_('sites')[id])
            } else {
                var sites = Smartgeo.get_('sites') ;
                for(var id_ in sites){
                    return sites[id_];
                }
            }
        };

        /**
         * @name getCurrent
         * @desc
         */
        Site.current = function() {
            return window.SMARTGEO_CURRENT_SITE;
        };

        /**
         * @name all
         * @desc
         */
        Site.all = function(callback) {
            var deferred = $q.defer();
            Smartgeo.get_('sites', function(sites){
                deferred.resolve(sites);
                (callback || function(){})(sites);
            });
            return deferred.promise;
        };

        /**
         * @name all
         * @desc
         */
        Site.get = function(id) {
            var deferred = $q.defer();
            Smartgeo.get_('sites', function(sites){
                deferred.resolve(sites[id]);
            });
            return deferred.promise;
        };

        return Site;
    }

})();

