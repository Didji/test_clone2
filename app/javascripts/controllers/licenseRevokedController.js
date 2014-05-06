/**
 * @class       licenseController
 * @classdesc
 *
 * @property {String} licenseNumber Numéro de série fourni par l'utilisateur
 */

angular.module('smartgeomobile').controller('licenseRevokedController', function($scope, $location, i18n, LicenseManager) {

    'use strict';

    $scope.errorMessage = i18n.get("_REGISTER_LICENSE_REVOKED");

    /**
     * @method
     * @memberOf    licenseController
     * @desc
     */
    $scope.update = function() {
        LicenseManager.update($scope.updateSuccess, $scope.updateError);
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc
     */
    $scope.updateSuccess = function() {
        $location.path('/');
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc
     */
    $scope.updateError = function(response) {
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


});
