(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ParametersController', ParametersController);

    ParametersController.$inject = ["$rootScope", "i18n", "$location"];

    /**
     * @class ParametersController
     * @desc Controlleur du menu de gestion des parametres
     */
    function ParametersController($rootScope, i18n, $location) {

        var vm = this;

        vm.confirm = confirm;

        /**
         * @name update
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirm() {
            alertify.confirm(i18n.get('_SYNC_UPDATE_CONFIRM_MESSAGE_', $rootScope.site.label), function(yes) {
                if (yes) { update(); }
            });
        };

        /**
         * @name update
         * @desc Démarre la mise à jour du site en cours
         */
        function update(){
            $location.path('sites/update/' + $rootScope.site.id);
        }
    }

})();