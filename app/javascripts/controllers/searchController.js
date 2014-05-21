angular.module('smartgeomobile').controller('searchController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n) {

    'use strict';

    window.mlPushMenu_ = new mlPushMenu(document.getElementById('mp-menu'), document.getElementById('trigger'), {
        type: 'cover'
    });

    $scope.searchIsPerforming = false;
    $scope.select2Options = {
        allowClear: true
    };
    $scope.site = window.currentSite;
    $scope.selectedCriteriaValues = {};

    // On index les critères en fonction des okeys, en les sortant des "tabs", pour faire un joli ng-repeat/ng-options
    $scope.criteria = {};
    for (var i in $scope.site.metamodel) {
        $scope.criteria[i] = [];
        $scope.criteria[i]._byKey = [];
        for (var j = 0; j < $scope.site.metamodel[i].tabs.length; j++) {
            for (var k = 0; k < $scope.site.metamodel[i].tabs[j].fields.length; k++) {
                $scope.criteria[i].push($scope.site.metamodel[i].tabs[j].fields[k]);
                $scope.criteria[i]._byKey[$scope.site.metamodel[i].tabs[j].fields[k].key] = $scope.site.metamodel[i].tabs[j].fields[k];
            }
        }
    }

    function closest(e, classname) {
        return classie.has(e, classname) ? e : e.parentNode && closest(e.parentNode, classname);
    }

    $scope.backToPreviousLevel = function (event) {
        event.preventDefault();
        var level = closest(event.currentTarget, 'mp-level').getAttribute('data-level');
        if (window.mlPushMenu_.level <= level) {
            event.stopPropagation();
            window.mlPushMenu_.level = closest(event.currentTarget, 'mp-level').getAttribute('data-level') - 1;
            if (window.mlPushMenu_.level === 0) {
                window.mlPushMenu_._resetMenu()
            } else {
                window.mlPushMenu_._closeMenu();
            }
        }
        return false;
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
        Smartgeo.findAssetsByLabel($scope.site, angular.copy($scope.searchTerms), function (results) {
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
            window.mlPushMenu_._resetMenu();
        });
    };


    $scope.resetCriteria = function () {
        $scope.selectedFamily = null;
        $scope.selectedCriteria = null;
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
            $scope.$$apply();
        }
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
        Smartgeo.findAssetsByCriteria($scope.site, advancedSearch, function (results) {
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
            window.mlPushMenu_._resetMenu();
        });
    };

});
