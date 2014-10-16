/**
 * @class       licenseRevokedController
 * @desc Controlleur de la page de révokation d'une licence.
 *
 * @param {LicenseManager} LicenseManager
 * @param {i18n} i18n
 *
 * @property {string} licenseNumber Numéro de série fourni par l'utilisateur
 * @property {string} errorMessage Message affiché en cas d'erreur
 */

angular.module('smartgeomobile').controller('licenseRevokedController', ["$scope", "$location", "i18n", "LicenseManager", function ($scope, $location, i18n, LicenseManager) {

    'use strict';

    $scope.errorMessage = i18n.get("_REGISTER_LICENSE_REVOKED");

    /**
     * @method
     * @memberOf    licenseController
     * @desc        Lance la mise à jour de la licence
     */
    $scope.update = function () {
        LicenseManager.update($scope.updateSuccess, $scope.updateError);
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc        Callback de succès de la mise à jour qui va rediriger l'utilisateur vers la page d'authentification
     */
    $scope.updateSuccess = function () {
        $location.path('/');
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc        Callback d'erreur de la mise à jour qui va afficher le message d'erreur en conséquence
     * @param       {object} response Réponse d'un objet angular $resource
     */
    $scope.updateError = function (response) {
        switch (response.status) {
        case 0:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_OFFLINE"));
            break;
        case 403:
            $scope.errorMessage = (i18n.get("_REGISTER_ERROR_NO_MORE_LICENSE"));
            break;
        case 404:
            $scope.errorMessage = (i18n.get("_REGISTER_LICENSE_REVOKED"));
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