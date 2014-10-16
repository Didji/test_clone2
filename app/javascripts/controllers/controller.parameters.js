(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ParametersController', ParametersController);

    ParametersController.$inject = ["$scope", "i18n", "$location"];

    /**
     * @class ParametersController
     * @desc Controlleur du menu de gestion des parametres
     */
    function ParametersController($scope, i18n, $location) {

        var vm = this;

        vm.confirmUpdate = confirmUpdate;
        vm.confirmRemove = confirmRemove;

        vm.site = window.SMARTGEO_CURRENT_SITE.label ;

        /**
         * @name confirmUpdate
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmUpdate() {
            alertify.confirm(i18n.get('_SYNC_UPDATE_CONFIRM_MESSAGE_', window.SMARTGEO_CURRENT_SITE.label), function(yes) {
                if (yes) { update(); }
            });
        };

        /**
         * @name confirmRemove
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmRemove() {
            alertify.confirm(i18n.get('_SYNC_UNINSTALL_CONFIRM_MESSAGE_', window.SMARTGEO_CURRENT_SITE.label), function(yes) {
                if (yes) { uninstall(); }
            });
        };

        /**
         * @name update
         * @desc Démarre la mise à jour du site en cours
         */
        function update(){
            $location.path('sites/update/' + window.SMARTGEO_CURRENT_SITE.id);
            $scope.$apply();
        }

        /**
         * @name uninstall
         * @desc Démarre la mise à jour du site en cours
         */
        function uninstall(){
            $location.path('sites/uninstall/' + window.SMARTGEO_CURRENT_SITE.id);
            $scope.$apply();
        }
    }

})();