/**
 * @class       parametersController
 * @classdesc   Controlleur du menu Paramètres
 */

angular.module('smartgeomobile').controller('parametersController', ["$scope", "i18n", "$location", function ($scope, i18n, $location) {

    'use strict';

    /**
     * @method
     * @memberOf parametersController
     * @desc
     */

    $scope.update = function () {
         alertify.confirm(i18n.get('_SYNC_UPDATE_CONFIRM_MESSAGE_', window.site.label), function (yes) {
            if (yes) {
                $location.path('sites/update/' + window.site.id);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

}]);
