angular.module('smartgeomobile').controller('siteUninstallController', function ($scope, $rootScope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer, i18n) {

    'use strict' ;

    var sites = Smartgeo.get_('sites');
    $rootScope.site = $rootScope.site || sites[$routeParams.site] ;
    Installer.uninstallSite($rootScope.site, function(){
        delete sites[$rootScope.site.id];
        Smartgeo.set_('sites', sites);
        $location.path('/');
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    });

});
