/**
 * @class       licenseController
 * @desc Controlleur de la page d'enregistrement du terminal.

 * @param {LicenseManager} LicenseManager
 * @param {i18n} i18n
 *
 * @property {string} errorMessage Message affiché en cas d'erreur
 * @property {String} licenseNumber Numéro de série fourni par l'utilisateur
 */

angular.module('smartgeomobile').controller('licenseController', ["$scope", "$rootScope", "$location", "Smartgeo", "i18n", "LicenseManager", function($scope, $rootScope, $location, Smartgeo, i18n, LicenseManager) {

    'use strict';

    /**
     * @method
     * @memberOf    licenseController
     * @desc        Lance l'enregistrement de la licence
     */
    $scope.register = function() {
        LicenseManager.register($scope.licenseNumber, $scope.registerSuccess, $scope.registerError);
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc        Callback de succès de l'enregistrement qui va rediriger l'utilisateur vers la page d'authentification
     */
    $scope.registerSuccess = function(licence) {
        $scope.successMessage = (i18n.get("_REGISTER_RECORD_ID_")) + licence.device_serial ;
    };

    /**
     * @method
     * @memberOf    licenseController
     * @desc        Redirige l'utilisateur vers la page d'authentification
     */
    $scope.continue = function() {
        $location.path('/');
    };

    /**
     * @method
     * @memberOf    licenseController
     * @desc        Callback d'erreur de l'enregistrement qui va afficher le message d'erreur en conséquence
     * @param       {object} response Réponse d'un objet angular $resource
     */
    $scope.registerError = function(response) {
        switch (response.status) {
        case 0:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_OFFLINE"));
            break;
        case 403:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_NO_MORE_LICENSE"));
            break;
        case 404:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_NOT_FOUND"));
            break;
        case 409:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_CONFLICT"));
            break;
        case 500:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_G3LIC"));
            break;
        default:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_UNKNOWN"));
            break;
        }
    };

}]);
