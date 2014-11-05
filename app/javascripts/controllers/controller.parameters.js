(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ParametersController', ParametersController);

    ParametersController.$inject = ["$rootScope", "$scope", "i18n", "$location", "Installer", "G3ME"];

    /**
     * @class ParametersController
     * @desc Controlleur du menu de gestion des parametres
     */
    function ParametersController($rootScope, $scope, i18n, $location, Installer, G3ME) {

        var vm = this;

        vm.confirmUpdate = confirmUpdate;
        vm.confirmRemove = confirmRemove;

        vm.site = window.SMARTGEO_CURRENT_SITE.label ;
        vm.updating = false;
        vm.lastUpdate = window.SMARTGEO_CURRENT_SITE.timestamp;

        /**
         * @name confirmUpdate
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmUpdate() {
            alertify.confirm(i18n.get('_SYNC_UPDATE_CONFIRM_MESSAGE_', window.SMARTGEO_CURRENT_SITE.label), function(yes) {
                if (yes) {
                    update();
                    $scope.$digest();
                }
            });
        }
        ;

        /**
         * @name confirmRemove
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmRemove() {
            alertify.confirm(i18n.get('_SYNC_UNINSTALL_CONFIRM_MESSAGE_', window.SMARTGEO_CURRENT_SITE.label), function(yes) {
                if (yes) {
                    uninstall();
                }
            });
        }
        ;

        /**
         * @name update
         * @desc Démarre la mise à jour du site en cours
         */
        function update() {
            vm.updating = true;
            Installer.update(window.SMARTGEO_CURRENT_SITE, function() {
                vm.updating = false;
            });
        }

        /**
         * @name uninstall
         * @desc Démarre la mise à jour du site en cours
         */
        function uninstall() {
            $location.path('sites/uninstall/' + window.SMARTGEO_CURRENT_SITE.id);
            $scope.$apply();
        }
    }

})();
