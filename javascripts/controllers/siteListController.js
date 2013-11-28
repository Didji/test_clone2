angular.module('smartgeomobile').controller('siteListController', function ($scope, $http, $location, Smartgeo, i18n) {
    $scope.ready = false;
    $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;
    Smartgeo.unset('lastLeafletMapExtent'); // VEOLIA - QC 9427

    function getRemoteSites(callback) {
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
                (callback || function(){})(true) ;
            }).error(function(error, errorCode){
                var knownSites = Smartgeo.get('sites') || {};
                // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                $scope.sites = [];
                for(var id in knownSites) {
                    $scope.sites.push(knownSites[id]);
                }
                // if(!$scope.sites.length){
                //     return  $location.path('/');
                // }
                autoLoadOrNot();
                $scope.ready = true;
                (callback || function(){})(false) ;
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
    }

    function autoLoadOrNot() {
        if($scope.sites.length > 1 || !$scope.sites[0]) {
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
    $scope.online === false ? getLocalSites() : getRemoteSites() ;

    $scope.reloadOnline = function(){
        $scope.errorMessage = "";
        // Smartgeo.set('online', true);
        // $scope.online = Smartgeo.get('online');
        // document.location.reload();
        getRemoteSites(function(success){
            if(success){
                Smartgeo.set('online', true);
                $scope.online = Smartgeo.get('online');
            } else {
                $scope.errorMessage = "La récupération des sites a échouée.";
            }
        });
    };
});
