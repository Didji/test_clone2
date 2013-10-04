function searchController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){

    // TODO : trouver mieux
    $scope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $scope.selectedCriteriaValues = {};

    // On index les critères en fonction des okeys, en les sortant des "tabs", pour faire un joli ng-repeat/ng-options
    $scope.criteria = {};
    for (var i in $scope.site.metamodel) {
        $scope.criteria[i] = [];
        for (var j = 0; j < $scope.site.metamodel[i].tabs.length; j++) {
            for (var k = 0; k < $scope.site.metamodel[i].tabs[j].fields.length; k++) {
                $scope.criteria[i].push($scope.site.metamodel[i].tabs[j].fields[k]);
            }
        }
    }

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
            $scope.mlPushMenu._resetMenu();
        });
    };

}
