angular.module('smartgeomobile').controller('siteUninstallController', function ($scope, $rootScope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer, i18n) {

    'use strict';

    var sites = Smartgeo.get_('sites');
    window.currentSite = window.currentSite || sites[$routeParams.site];
    Installer.uninstallSite(window.currentSite, function () {
        delete sites[window.currentSite.id];
        Smartgeo.set_('sites', sites);
        $location.path('/');
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });

});
