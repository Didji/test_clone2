function siteUninstallController($scope, $rootScope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer) {
    var sites = JSON.parse(Smartgeo.get('sites'));

    $rootScope.site = $rootScope.site || sites[$routeParams.site] ;

    Installer.uninstallSite($rootScope.site, function(){
        delete sites[$rootScope.site.id];
        Smartgeo.set('sites', JSON.stringify(sites));
        $location.path('#');
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    });

}
