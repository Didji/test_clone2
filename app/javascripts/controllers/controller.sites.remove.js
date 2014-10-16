(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('SiteRemoveController', SiteRemoveController);

    SiteRemoveController.$inject = ["$scope", "$rootScope", "$routeParams", "Smartgeo", "$location", "Installer", "Storage", "prefetchedlocalsites"];

    /**
     * @class SiteRemoveController
     * @desc Controlleur de la page de suppression de site.
     */

    function SiteRemoveController($scope, $rootScope, $routeParams, Smartgeo, $location, Installer, Storage, prefetchedlocalsites) {

        var vm = this;

        vm.siteLabel = "";

        var removedSite = {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            removedSite = prefetchedlocalsites;
            vm.siteLabel = removedSite.label;
            Installer.uninstallSite(removedSite, siteHasBeenRemoved);
        }

        /**
         * @name siteHasBeenRemoved
         * @desc Callback de fin de suppression de site
         */
        function siteHasBeenRemoved() {
            //TODO(@gulian): Site.remove(id);
            Storage.get_('sites', function(sites) {
                delete sites[prefetchedlocalsites.id];
                Storage.set_('sites', sites);
                $location.path(Object.keys(sites).length === 0 ? '/' : '/sites');
                $scope.$apply();
            });


        }

    }

})();