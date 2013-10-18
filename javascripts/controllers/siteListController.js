function siteListController($scope, $http, $location, Smartgeo) {
    $scope.ready = false;
    $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

    function getRemoteSites() {
        var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.site.json');
        $http.get(url)
            .success(function(sites){
                var sitesById = {},
                    knownSites = Smartgeo.get('sites') || {},
                    site, tmpsites = {};
                for(var i = 0, lim = sites.length; i < lim; i++) {
                    site = sites[i];
                    tmpsites[site.id] = site;
                }

                angular.extend(tmpsites, sitesById, knownSites);

                // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                $scope.sites = [];
                for(var id in tmpsites) {
                    $scope.sites.push(tmpsites[id]);
                }

                autoLoadOrNot();

                $scope.ready = true;
            });
    }
    function getLocalSites() {


        var sitesById = {},
            knownSites = Smartgeo.get('sites') || {},
            site, tmpsites = {};

        // Pour que les filtres fonctionnent, il nous faut un simple tableau.
        $scope.sites = [];
        for(var id in knownSites) {
            $scope.sites.push(knownSites[id]);
        }

        autoLoadOrNot();


        // $scope.sites = Smartgeo.get('sites') ;
        $scope.ready = true;
                // autoLoadOrNot();
        console.log($scope.sites);
    }

    function autoLoadOrNot() {
        if($scope.sites.length > 1) {
            // On a plus d'un site : on reste dans cette vue
            // pour afficher la liste des sites et laisser l'utilisateur
            // choisir.
            $scope.ready = true;
            return;
        }

        // Il n'y a qu'un seul site.
        // S'il est installé, on le charge. Sinon, on l'installe.
        var site = $scope.sites[0];
        if(site && site.installed) {
            $location.path('/map/'+site.id);
        } else {
            $location.path('/sites/install/'+site.id);
        }
    }

    $scope.isInstalled = function(site) {
        return !!site.installed;
    };
    $scope.isUnInstalled = function(site) {
        return !site.installed;
    };

    $scope.online = Smartgeo.get('online');
    $scope.online === true ? getRemoteSites() : getLocalSites();

}
