(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Site', SiteFactory);

    SiteFactory.$inject = ["$rootScope"];


    function SiteFactory($rootScope) {

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
            if(window.site || $rootScope.site){
                return $rootScope.site;
            } else if(id){
                return (window.site = $rootScope.site = $rootScope.site || Smartgeo.get_('sites')[id])
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
            return window.site || $rootScope.site;
        };

        return Site;
    }

})();