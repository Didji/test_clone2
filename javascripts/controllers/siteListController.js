function siteListController($scope, $http, Smartgeo) {
    $http.get(Smartgeo.get('url')+"gi.maintenance.mobility.site.json")
        .success(function(sites){
            $scope.sites = JSON.parse(localStorage.sites) ;
            angular.extend($scope.sites, sites);
        });
}
