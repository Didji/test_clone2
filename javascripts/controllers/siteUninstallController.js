angular.module('smartgeomobile').controller('siteUninstallController', function ($scope, $rootScope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer, i18n) {

    'use strict' ;

    var sites = Smartgeo.get('sites'), site =  sites[$routeParams.site] ;

    console.log(site, sites) ;
    Installer.uninstallSite($rootScope.site, function(){
        delete sites[$rootScope.site.id];
        Smartgeo.set('sites', sites);
        console.log(sites) ;
        $location.path('/');
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    });

});
