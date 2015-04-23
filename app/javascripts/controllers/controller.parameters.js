(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ParametersController', ParametersController );

    ParametersController.$inject = ["$scope", "i18n", "$location", "Site", "Installer", "LicenseManager"];

    /**
     * @class ParametersController
     * @desc Controlleur du menu de gestion des parametres
     */
    function ParametersController($scope, i18n, $location, Site, Installer, LicenseManager) {

        var vm = this;

        vm.confirmUpdate = confirmUpdate;
        vm.confirmRemove = confirmRemove;

        vm.site = Site.current.label;
        vm.lastUpdate = Site.current.timestamp * 1000;
        vm.updating = false;

        /**
         * @name confirmUpdate
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmUpdate() {
            alertify.confirm( i18n.get( '_SYNC_UPDATE_CONFIRM_MESSAGE_', Site.current.label ), function(yes) {
                if (yes) {
                    update();
                    $scope.$digest();
                }
            } );
        }

        /**
         * @name confirmRemove
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmRemove() {
            alertify.confirm( i18n.get( '_SYNC_UNINSTALL_CONFIRM_MESSAGE_', Site.current.label ), function(yes) {
                if (yes) {
                    uninstall();
                }
            } );
        }

        /**
         * @name update
         * @desc Démarre la mise à jour du site en cours
         */
        function update() {
            vm.updating = true;
            // LicenseManager.update( true );
            Installer.update( Site.current, function() {
                vm.updating = false;
                vm.lastUpdate = Site.current.timestamp * 1000;
                $scope.$digest();
            } );
        }

        /**
         * @name uninstall
         * @desc Démarre la mise à jour du site en cours
         */
        function uninstall() {
            $scope.$apply( function() {
                $location.path( 'sites/uninstall/' + Site.current.id );
            } );
        }
    }

})();
