angular.module('smartgeomobile').controller('searchController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){

    $rootScope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

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

    function closest( e, classname ) {
        return classie.has( e, classname )? e  : e.parentNode && closest( e.parentNode, classname );
    }

    $scope.backToPreviousLevel = function(event){
        event.preventDefault();
        var level = closest( event.currentTarget, 'mp-level' ).getAttribute( 'data-level' );
        if( $scope.mlPushMenu.level <= level ) {
            event.stopPropagation();
            $scope.mlPushMenu.level = closest( event.currentTarget, 'mp-level' ).getAttribute( 'data-level' ) - 1;
            $scope.mlPushMenu.level === 0 ? $scope.mlPushMenu._resetMenu() : $scope.mlPushMenu._closeMenu();
        }
        return false;
    };

    $scope.search = function(event) {
        event.preventDefault();
        $scope.searchMessage = 'Recherche en cours' ;
        $scope.searchIsPerforming = true ;
        Smartgeo.findAssetsByLabel($rootScope.site, angular.copy($scope.searchTerms), function(results){
            $scope.searchIsPerforming = false ;

            if(!results.length){
                $scope.searchMessage = 'Aucun résultat' ;
                if(!$scope.$$phase) {
                	$scope.$apply();
                }
                return ;
            } else {
                $scope.searchMessage = '';
            }

            var assets = [], asset, asset_;
            for (var i = 0; i < results.length; i++) {
                asset_ = results[i];
                asset  = Smartgeo.sanitizeAsset(asset_.asset);
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
            if($scope.selectedCriteriaValues[$scope.selectedCriteria[i]]){
                newSelectedCriteriaValues[$scope.selectedCriteria[i]] = $scope.selectedCriteriaValues[$scope.selectedCriteria[i]];
            }
        }
        $scope.selectedCriteriaValues = newSelectedCriteriaValues ;
        if(!$scope.$$phase) {
            $scope.$$apply();
        }
    };

    $scope.advancedSearch = function(event) {
        event.preventDefault();

        $scope.searchMessage = "";

        var advancedSearch ;

        if($scope.selectedFamily){
            advancedSearch = {
                criteria : $scope.selectedCriteriaValues,
                okey : $scope.selectedFamily.okey
            };
            $scope.advancedSearchMessage = "Recherche en cours";
        } else {
            $scope.advancedSearchMessage = "Veuillez choisir un type d'objet";
            return ;
        }

        $scope.searchIsPerforming = true ;
        Smartgeo.findAssetsByCriteria($rootScope.site, advancedSearch, function(results){
            $scope.searchIsPerforming = false ;

            if(!results.length){
                $scope.advancedSearchMessage = 'Aucun résultat' ;
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
                return ;
            } else {
                $scope.advancedSearchMessage = '';
            }

            var assets = [], asset, asset_;
            for (var i = 0; i < results.length; i++) {
                asset_ = results[i];
                asset  = Smartgeo.sanitizeAsset(asset_.asset);
                asset.label = asset_.label ;
                asset.geometry = JSON.parse(asset_.geometry) ;
                assets.push(asset);
            }
            $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
            $scope.mlPushMenu._resetMenu();
        });
    };

});
