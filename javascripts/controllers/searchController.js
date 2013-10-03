function searchController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){

    // TODO : trouver mieux
    new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    console.log($scope.site.metamodel);

    $scope.search = function(event) {
        event.preventDefault();
        Smartgeo.findAssetsByLabel($scope.site, $scope.searchTerms, function(results){
            var assets = [], asset, asset_;
            for (var i = 0; i < results.length; i++) {
                asset_ = results[i];
                asset  = JSON.parse(asset_.asset);
                asset.label = asset_.label ;
                asset.geometry = JSON.parse(asset_.geometry) ;
                assets.push(asset);
            }
            $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
        });
    };

}
