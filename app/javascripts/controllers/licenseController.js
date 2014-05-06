/**
 * @class       licenseController
 * @classdesc
 *
 * @property {String} licenseNumber Numéro de série fourni par l'utilisateur
 */

angular.module('smartgeomobile').controller('licenseController', function($scope, $rootScope, $location, Smartgeo, i18n, LicenseManager) {

    'use strict';

    /**
     * @method
     * @memberOf    licenseController
     * @desc
     */
    $scope.register = function() {
        LicenseManager.register($scope.licenseNumber, $scope.registerSuccess, $scope.registerError);
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc
     */
    $scope.registerSuccess = function() {
        $location.path('/');
    };


    /**
     * @method
     * @memberOf    licenseController
     * @desc
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


});
