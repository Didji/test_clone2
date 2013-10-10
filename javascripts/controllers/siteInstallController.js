function siteInstallController($scope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer) {
    $scope.siteId = $routeParams.site;

    $http.get(Smartgeo.get('url')+"gi.maintenance.mobility.site.json").success(function(sites){

        $scope.sites = JSON.parse(Smartgeo.get('sites') || '{}') ;

        angular.extend($scope.sites, sites);

        for (var i = 0; i < sites.length; i++) {
            if(sites[i].id === $scope.siteId){
                $scope.site = sites[i];
            }
        }

        Installer.getInstallJSON($scope.siteId, function(site){
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

