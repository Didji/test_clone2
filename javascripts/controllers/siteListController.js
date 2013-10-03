function siteListController($scope, $http, $location, Smartgeo) {
    $scope.ready = false;

    function getRemoteSites() {
        $http.get(Smartgeo.get('url')+"gi.maintenance.mobility.site.json")
            .success(function(sites){
                var sitesById = {}, 
                    knownSites = JSON.parse(localStorage.sites ||'{}'),
                    site;
                $scope.sites = {};
                for(var i = 0, lim = sites.length; i < lim; i++) {
                    site = sites[i];
                    sitesById[site.id] = site;
                }
                angular.extend($scope.sites, sitesById, knownSites);
                
                autoLoadOrNot();
                
                $scope.ready = true;
            });
    }
    function getLocalSites() {
        $scope.sites = JSON.parse(localStorage.sites) ;
        $scope.ready = true;
    }
    
    function autoLoadOrNot() {
        var numsites = 0, id;
        for(id in $scope.sites) {
            numsites++;
            if(numsites > 1) {
                // On a plus d'un site : on reste dans cette vue 
                // pour afficher la liste des sites et laisser l'utilisateur
                // choisir.
                $scope.ready = true;
                return;
            }
        }
        
        // Il n'y a qu'un seul site.
        // S'il est installé, on le charge. Sinon, on l'installe.
        if($scope.sites[id].installed) {
            $location.path('/map/'+id);
        } else {
            $location.path('/sites/install/'+id);
        }
    }
    
    Smartgeo.get('online') === 'true' ? getRemoteSites() : getLocalSites();

}
