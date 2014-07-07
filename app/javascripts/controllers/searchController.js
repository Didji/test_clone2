angular.module('smartgeomobile').controller('searchController', ["$scope", "$routeParams", "$window", "$rootScope", "Smartgeo", "SQLite", "i18n", function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n) {

    'use strict';

    $scope.searchIsPerforming = false;
    $scope.select2Options = {
        allowClear: true
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

    function closest(e, classname) {
        return classie.has(e, classname) ? e : e.parentNode && closest(e.parentNode, classname);
    }

    $scope.sendCriteria = function (event) {
        if ($scope.advancedSearchDisplay) {
            return $scope.advancedSearch(event);
        }
        return $scope.search(event);
    };
    $scope.search = function (event) {

        event.preventDefault();

        if ($scope.searchIsPerforming) {
            window._SMARTGEO_STOP_SEARCH = true;
            $scope.searchMessage = '_SEARCH_SEARCH_HAS_BEEN_CANCELED';
            $scope.searchIsPerforming = false;
            return;
        }

        $scope.searchMessage = '_SEARCH_SEARCH_IN_PROGRESS';
        $scope.searchIsPerforming = true;
        Smartgeo.findAssetsByLabel($rootScope.site, angular.copy($scope.searchTerms), function (results) {
            $scope.searchIsPerforming = false;

            if (!results.length) {
                $scope.searchMessage = '_SEARCH_SEARCH_NO_RESULT';
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                return;
            } else {
                $scope.searchMessage = '';
            }

            var assets = [],
                asset, asset_;
            for (var i = 0; i < results.length; i++) {
                asset_ = results[i];
                asset = Smartgeo.sanitizeAsset(asset_.asset);
                asset.label = asset_.label;
                asset.geometry = JSON.parse(asset_.geometry);
                assets.push(asset);
            }
            $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
        });
    };


    $scope.resetCriteria = function () {
        $scope.selectedFamily = null;
        $scope.selectedCriteria = [];
        $scope.selectedCriteriaChangeHandler();
       $('[ng-model=selectedCriteria]').select2("val", "");

    };

    $scope.selectedCriteriaChangeHandler = function () {
        var newSelectedCriteriaValues = {};
        for (var i = 0; i < $scope.selectedCriteria.length; i++) {
            if ($scope.selectedCriteriaValues[$scope.selectedCriteria[i]]) {
                newSelectedCriteriaValues[$scope.selectedCriteria[i]] = $scope.selectedCriteriaValues[$scope.selectedCriteria[i]];
            }
        }
        $scope.selectedCriteriaValues = newSelectedCriteriaValues;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
        console.log($scope);
    };

    $scope.advancedSearch = function (event) {
        event.preventDefault();

        $scope.searchMessage = "";

        if ($scope.searchIsPerforming) {
            window._SMARTGEO_STOP_SEARCH = true;
            $scope.advancedSearchMessage = '_SEARCH_SEARCH_HAS_BEEN_CANCELED';
            $scope.searchIsPerforming = false;
            return;
        }

        var advancedSearch;

        if ($scope.selectedFamily) {
            advancedSearch = {
                criteria: $scope.selectedCriteriaValues,
                okey: $scope.selectedFamily.okey
            };
            $scope.advancedSearchMessage = "_SEARCH_SEARCH_IN_PROGRESS";
        } else {
            $scope.advancedSearchMessage = "_SEARCH_PICK_OBJECT_TYPE";
            return;
        }

        $scope.searchIsPerforming = true;
        Smartgeo.findAssetsByCriteria($rootScope.site, advancedSearch, function (results) {
            $scope.searchIsPerforming = false;

            if (!results.length) {
                $scope.advancedSearchMessage = '_SEARCH_SEARCH_NO_RESULT';
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                return;
            } else {
                $scope.advancedSearchMessage = '';
            }

            var assets = [],
                asset, asset_;
            for (var i = 0; i < results.length; i++) {
                asset_ = results[i];
                asset = Smartgeo.sanitizeAsset(asset_.asset);
                asset.label = asset_.label;
                asset.geometry = JSON.parse(asset_.geometry);
                assets.push(asset);
            }
            $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
        });
    };
}]);
