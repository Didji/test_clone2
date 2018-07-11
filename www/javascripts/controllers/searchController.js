angular.module("smartgeomobile").controller("searchController", [
    "$scope",
    "$routeParams",
    "$window",
    "$rootScope",
    "i18n",
    "Asset",
    "Site",
    function($scope, $routeParams, $window, $rootScope, i18n, Asset, Site) {
        "use strict";

        $scope.searchIsPerforming = false;
        $scope.metamodel = Site.current.metamodel;
        $scope.lists = Site.current.lists;

        $scope.selectedCriteria = {
            labels: [],
            keys: []
        };
        $scope.isIOS = navigator.userAgent.match(/iP(od|hone|ad)/i);
        $scope.selectedCriteriaValues = {};
        $scope.allCriters = {};
        // On index les critères en fonction des okeys, en les sortant des "tabs", pour faire un joli ng-repeat/ng-options
        $scope.criteria = {};
        for (var i in Site.current.metamodel) {
            $scope.criteria[i] = [];
            $scope.criteria[i]._byKey = [];
            for (var j = 0; j < Site.current.metamodel[i].tabs.length; j++) {
                for (var k = 0; k < Site.current.metamodel[i].tabs[j].fields.length; k++) {
                    var field = Site.current.metamodel[i].tabs[j].fields[k];
                    $scope.criteria[i].push(field);
                    $scope.criteria[i]._byKey[field.key] = field;
                }
            }
        }

        $scope.sendCriteria = function(event) {
            if ($scope.advancedSearchDisplay) {
                return $scope.advancedSearch(event);
            }
            return $scope.search(event);
        };

        $scope.search = function(event) {
            event.preventDefault();

            if ($scope.searchIsPerforming) {
                window._SMARTGEO_STOP_SEARCH = true;
                $scope.searchMessage = "_SEARCH_SEARCH_HAS_BEEN_CANCELED";
                $scope.searchIsPerforming = false;
                return;
            }

            $scope.searchMessage = "_SEARCH_SEARCH_IN_PROGRESS";
            $scope.searchIsPerforming = true;
            Asset.findAssetsByLabel(angular.copy($scope.searchTerms), function(results) {
                $scope.searchIsPerforming = false;

                if (!results.length) {
                    $scope.searchMessage = "_SEARCH_SEARCH_NO_RESULT";
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                    return;
                } else {
                    $scope.searchMessage = "";
                }

                var assets = [];

                for (var i = 0; i < results.length; i++) {
                    assets.push(new Asset(Asset.convertRawRow(results[i])));
                }
                $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
                $scope.$digest();
            });
        };

        $scope.resetCriteria = function() {
            $scope.selectedFamily = null;
            $scope.selectedCriteria = {
                labels: [],
                keys: []
            };
            $scope.allCriters = {};
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.selectedFamilyChangeHandler = function() {
            $scope.selectedCriteria = {
                labels: [],
                keys: []
            };
        };

        $scope.selectedCriteriaChangeHandlerForIos = function(item) {
            var newSelectedCriteriaLabels = [];
            for (var i in $scope.selectedCriteria.keys) {
                newSelectedCriteriaLabels[i] =
                    $scope.criteria[$scope.selectedFamily.okey]._byKey[$scope.selectedCriteria.keys[i]].label;
            }
            $scope.selectedCriteria.labels = newSelectedCriteriaLabels;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.selectedCriteriaChangeHandler = function(item) {
            $scope.selectedCriteria = {
                labels: [],
                keys: []
            };
            for (var i in item) {
                $scope.allCriters.checked[i] = item[i];
                if (item[i] === true) {
                    $scope.selectedCriteria.labels.push($scope.allCriters.labels[i]);
                    $scope.selectedCriteria.keys.push($scope.allCriters.keys[i]);
                }
            }
            var newSelectedCriteriaValues = {};
            for (var i = 0; i < $scope.selectedCriteria.keys.length; i++) {
                if ($scope.selectedCriteriaValues[$scope.selectedCriteria.keys[i]]) {
                    newSelectedCriteriaValues[$scope.selectedCriteria.keys[i]] =
                        $scope.selectedCriteriaValues[$scope.selectedCriteria.keys[i]];
                }
            }
            $scope.selectedCriteriaValues = newSelectedCriteriaValues;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.removeCriteria = function(item) {
            var i = $scope.allCriters.labels.indexOf(item);
            var key = $scope.allCriters.keys[i];
            $scope.selectedCriteria.keys.splice($scope.selectedCriteria.keys.indexOf(key), 1);
            $scope.allCriters.checked[i] = false;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.showCriteria = function(e) {
            if (e.target.className.indexOf("ui-select-search") !== -1) {
                if (!e.target.hasAttribute("readonly")) {
                    e.target.setAttribute("readonly", "readonly");
                }
                if (
                    Object.keys($scope.allCriters).length === 0 ||
                    $scope.allCriters.selectedFamily != $scope.selectedFamily
                ) {
                    $scope.allCriters = {
                        selectedFamily: $scope.selectedFamily,
                        labels: [],
                        keys: [],
                        checked: []
                    };
                    for (var i in $scope.criteria[$scope.selectedFamily.okey]) {
                        if (!isNaN(i)) {
                            $scope.allCriters.labels.push($scope.criteria[$scope.selectedFamily.okey][i].label);
                            $scope.allCriters.keys.push($scope.criteria[$scope.selectedFamily.okey][i].key);
                            $scope.allCriters.checked.push(
                                $scope.selectedCriteria.keys.indexOf($scope.allCriters.keys[i]) !== -1
                            );
                        }
                    }
                }
                navigator.notification.ex.selectMulti(
                    $scope.selectedCriteriaChangeHandler,
                    angular.noop,
                    $scope.allCriters.labels,
                    $scope.allCriters.checked,
                    "Sélection des critères"
                );
            }
        };

        $scope.advancedSearch = function(event) {
            event.preventDefault();

            $scope.searchMessage = "";

            if ($scope.searchIsPerforming) {
                window._SMARTGEO_STOP_SEARCH = true;
                $scope.advancedSearchMessage = "_SEARCH_SEARCH_HAS_BEEN_CANCELED";
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
            Asset.findAssetsByCriteria(advancedSearch, function(results) {
                $scope.searchIsPerforming = false;

                if (!results.length) {
                    $scope.advancedSearchMessage = "_SEARCH_SEARCH_NO_RESULT";
                    $scope.$digest();

                    return;
                } else {
                    delete $scope.advancedSearchMessage;
                }

                var assets = [];
                for (var i = 0; i < results.length; i++) {
                    assets.push(new Asset(Asset.convertRawRow(results[i])));
                }
                $rootScope.$broadcast("UPDATE_CONSULTATION_ASSETS_LIST", assets);
                $scope.$digest();
            });
        };
    }
]);
