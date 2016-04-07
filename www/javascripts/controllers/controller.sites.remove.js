(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'SiteRemoveController', SiteRemoveController );

    SiteRemoveController.$inject = ["$scope", "$location", "Installer", "Storage", "prefetchedlocalsites", "LicenseManager"];

    /**
     * @class SiteRemoveController
     * @desc Controlleur de la page de suppression de site.
     */

    function SiteRemoveController($scope, $location, Installer, Storage, prefetchedlocalsites, LicenseManager) {

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
            Installer.uninstallSite( removedSite, siteHasBeenRemoved );
        }

        /**
         * @name siteHasBeenRemoved
         * @desc Callback de fin de suppression de site
         */
        function siteHasBeenRemoved() {
            Storage.get_( 'sites', function(sites) {
                delete sites[prefetchedlocalsites.id];
                Storage.set_( 'sites', sites );
                $location.path( Object.keys( sites ).length === 0 ? ((LicenseManager.oauth) ? '/oauth' : '/') : '/sites' );
                $scope.$apply();
            } );


        }

    }

})();
