(function() {
    "use strict";

    angular.module("smartgeomobile").controller("ParametersController", ParametersController);

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
        vm.lastUpdate = lastUpdate;
        vm.errorLastUpdate = false;

        function lastUpdate() {
            return Site.current.timestamp * 1000;
        }

        /**
         * @name confirmUpdate
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmUpdate() {
            alertify.confirm(i18n.get("_SYNC_UPDATE_CONFIRM_MESSAGE_", Site.current.label), function(yes) {
                if (yes) {
                    update();
                    $scope.$digest();
                }
            });
        }

        /**
         * @name confirmRemove
         * @desc Demande confirmation avant de lancer la mise à jour du site en cours
         */
        function confirmRemove() {
            alertify.confirm(i18n.get("_SYNC_UNINSTALL_CONFIRM_MESSAGE_", Site.current.label), function(yes) {
                if (yes) {
                    uninstall();
                }
            });
        }

        /**
         * @name update
         * @desc Démarre la mise à jour du site en cours
         */
        function update() {
            // LicenseManager.update( true );

            //on prend garde à ne pas éteindre l'écran pendant la mise à jour, cela stoppe les requêtes
            document.addEventListener(
                "deviceready",
                function() {
                    // le listener sur deviceReady est OBLIGATOIRE pour cette fonctionnalité
                    //et si on ne le mets pas explicitement ca ne fonctionne pas
                    window.powermanagement.acquire();
                },
                false
            );

            Installer.update(Site.current, function(error) {
                if (error) {
                    vm.errorLastUpdate = true;
                }
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
                document.addEventListener(
                    "deviceready",
                    function() {
                        // le listener sur deviceReady est OBLIGATOIRE pour cette fonctionnalité
                        //et si on ne le mets pas explicitement ca ne fonctionne pas
                        window.powermanagement.release();
                    },
                    false
                );
            });
        }

        /**
         * @name uninstall
         * @desc Démarre la mise à jour du site en cours
         */
        function uninstall() {
            $scope.$apply(function() {
                $location.path("sites/uninstall/" + Site.current.id);
            });
        }
    }
})();
