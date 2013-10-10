function siteInstallController($scope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer) {

    $http.get(Smartgeo.get('url')+"gi.maintenance.mobility.site.json").success(function(sites){

        $scope.sites = JSON.parse(Smartgeo.get('sites') || '{}') ;

        angular.extend($scope.sites, sites);

        for (var i = 0; i < sites.length; i++) {
            if(sites[i].id === $routeParams.site){
                $scope.site = sites[i];
            }
        }

        Installer.getInstallJSON($scope.site, function(site){
            var formatedSite = Installer.formatSiteMetadata(site)
            angular.extend($scope.site, formatedSite);
            Installer.createZones($scope.site, function(){
                Installer.install($scope.site, $scope.site.stats, function(){
                    $scope.site.installed = true ;
                    Installer.saveSite($scope.site);
                    $location.path('/map/'+$routeParams.site);
                    if(!$scope.$$phase) {
                        $scope.$apply();
                    }
                });
            });
        });
    });
}
