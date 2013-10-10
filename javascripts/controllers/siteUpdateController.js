function siteUpdateController($scope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer) {

    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;

    $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.site.json')).success(function(sites){

        $scope.sites = JSON.parse(Smartgeo.get('sites') || '{}') ;

        angular.extend($scope.sites, sites);

        for (var i = 0; i < sites.length; i++) {
            if(sites[i].id === $scope.siteId){
                $scope.site = sites[i];
            }
        }

        Installer.getUpdateJSON($scope.site, function(site){
            var formatedSite = Installer.formatSiteMetadata(site)
            angular.extend($scope.site, formatedSite);
            Installer.update($scope.site, $scope.site.stats, function(){
                Installer.saveSite($scope.site);
                $location.path('/map/'+$routeParams.site);
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        });
    });
}
