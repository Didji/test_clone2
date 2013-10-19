function searchController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){

    // TODO : trouver mieux
    $scope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});
    $scope.searchIsPerforming = false ;
    $scope.select2Options = {
        allowClear:true
    };

    $scope.selectedCriteriaValues = {};

    // On index les critères en fonction des okeys, en les sortant des "tabs", pour faire un joli ng-repeat/ng-options
    $scope.criteria = {};
    for (var i in $rootScope.site.metamodel) {
        $scope.criteria[i] = [];
        $scope.criteria[i]._byKey = [];
        for (var j = 0; j < $rootScope.site.metamodel[i].tabs.length; j++) {
            for (var k = 0; k < $rootScope.site.metamodel[i].tabs[j].fields.length; k++) {
                $scope.criteria[i].push($rootScope.site.metamodel[i].tabs[j].fields[k]);
                $scope.criteria[i]._byKey[$rootScope.site.metamodel[i].tabs[j].fields[k].key] = $rootScope.site.metamodel[i].tabs[j].fields[k];
            }
        }
    }


    $scope.search = function(event) {
        event.preventDefault();
        $scope.searchMessage = 'Recherche en cours' ;
        $scope.searchIsPerforming = true ;
        Smartgeo.findAssetsByLabel($rootScope.site, angular.copy($scope.searchTerms), function(results){
            $scope.searchIsPerforming = false ;

            if(!results.length){
                $scope.searchMessage = 'Aucun résultat' ;
                $scope.$apply();
                return ;
            } else {
                $scope.searchMessage = '';
            }

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

    $scope.resetCriteria = function(){
        $scope.selectedFamily = null;
        $scope.selectedCriteria = null;
    };

    $scope.selectedCriteriaChangeHandler = function(){
        var newSelectedCriteriaValues = {};
        for (var i = 0; i < $scope.selectedCriteria.length; i++) {
            if($scope.selectedCriteriaValues[$scope.selectedCriteria[i].key]){
                newSelectedCriteriaValues[$scope.selectedCriteria[i].key] = $scope.selectedCriteriaValues[$scope.selectedCriteria[i].key];
            }
        }
        $scope.selectedCriteriaValues = newSelectedCriteriaValues ;
    };

    $scope.advancedSearch = function(event) {
        event.preventDefault();

        var advancedSearch = {
            criteria : $scope.selectedCriteriaValues,
            okey : $scope.selectedFamily.okey
        };

        $scope.searchIsPerforming = true ;
        Smartgeo.findAssetsByCriteria($rootScope.site, advancedSearch, function(results){
            $scope.searchIsPerforming = false ;

            if(!results.length){
                $scope.advancedSearchMessage = 'Aucun résultat' ;
                $scope.$apply();
                return ;
            } else {
                $scope.advancedSearchMessage = '';
            }

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
