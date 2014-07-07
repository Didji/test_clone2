/**
 * @class       menuController
 * @classdesc   Controlleur du menu
 *
 * @property {boolean} display Visibilité du menu
 * @property {boolean} siteSelectionEnable Visibilité du bouton de selection de site
 * @property {array} menuItems Item du menu
 * @property {array} bottomMenuItems Item du menu fix
 */

angular.module('smartgeomobile').controller('menuController', ["$scope", "$routeParams", "$window", "$rootScope", "Smartgeo", "SQLite", "i18n", "$timeout", "$http", "$location",
    function($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout, $http, $location) {

        'use strict';

        /**
         * @method
         * @memberOf menuController
         * @desc Methode d'initialisation, appelée après le chargement du DOM
         */
        $scope.initialize = function() {

            $scope.display = true;

            $scope.siteSelectionEnable = false;

            $scope.menuItems = [{
                id: 'search',
                label: i18n.get('_MENU_SEARCH'),
                icon: "icon icon-search",
                template: 'partials/search.html',
                forceLoadDOM: false
            }, {
                id: 'planning',
                label: i18n.get('_MENU_PLANNING'),
                icon: "icon icon-calendar",
                template: 'partials/planning.html',
                forceLoadDOM: true
            }, {
                id: 'census',
                label: i18n.get('_MENU_CENSUS'),
                icon: "icon icon-plus",
                template: 'partials/census.html',
                forceLoadDOM: false
            }, {
                id: 'activelayers',
                label: i18n.get('_MENU_ACTIVE_LAYERS'),
                icon: "icon icon-list-ul",
                template: 'partials/layers.html',
                forceLoadDOM: false
            }, {
                id: 'synccenter',
                label: i18n.get('_MENU_SYNC'),
                icon: "icon icon-refresh",
                template: 'partials/synchronizationMenu.html',
                forceLoadDOM: true
            }];

            $scope.bottomMenuItems = [{
                id: 'consultation',
                label: 'Consultation',
                icon: "icon icon-info-sign",
                action: 'activateConsultation',
            }, {
                id: 'myposition',
                label: 'Ma position',
                icon: "icon icon-compass",
                action: 'activatePosition',
            }, {
                id: 'siteselection',
                label: 'Selection de site',
                icon: "icon icon-exchange",
                action: 'changeSite',
                specialVisibility: 'checkIfMoreThanOneSiteIsAvailable'
            }, {
                id: 'logout',
                label: 'Déconnexion',
                icon: "icon icon-power-off redicon",
                action: 'logout',
            }];


            $scope.applyVisibility();

            $rootScope.$on('DEVICE_IS_ONLINE', $scope.checkIfMoreThanOneSiteIsAvailable);
            $rootScope.$on('DEVICE_IS_OFFLINE', $scope.checkIfMoreThanOneSiteIsAvailable);

            $scope.checkIfMoreThanOneSiteIsAvailable();

            $rootScope.$watch('reports', function(event) {

                $scope.toSyncNumber = 0;

                if ($rootScope.reports && $rootScope.reports._byUUID) {
                    for (var uuid in $rootScope.reports._byUUID) {
                        if (!$rootScope.reports._byUUID[uuid].synced) {
                            $scope.toSyncNumber++;
                        }
                    }
                }
                if ($rootScope.censusAssets && $rootScope.censusAssets._byUUID) {
                    for (var uuid in $rootScope.censusAssets._byUUID) {
                        if (!$rootScope.censusAssets._byUUID[uuid].synced) {
                            $scope.toSyncNumber++;
                        }
                    }
                }
            });

        };

        /**
         * @method
         * @memberOf menuController
         * @desc Applique la visibilité aux éléments du menu en fonction des droits et de l'attribut 'specialVisibility' s'il est défini.
         */
        $scope.applyVisibility = function() {
            for (var menuItem in $scope.menuItems) {
                $scope.menuItems[menuItem].displayMenuItem = $rootScope.rights[$scope.menuItems[menuItem].id] && ($scope.menuItems[menuItem].specialVisibility ? $scope[$scope.menuItems[menuItem].specialVisibility]() : true);
                $scope.menuItems[menuItem].displayItemContent = false;
            }

            for (var menuItem in $scope.bottomMenuItems) {
                $scope.bottomMenuItems[menuItem].displayMenuItem = $rootScope.rights[$scope.bottomMenuItems[menuItem].id] && ($scope.bottomMenuItems[menuItem].specialVisibility ? $scope[$scope.bottomMenuItems[menuItem].specialVisibility]() : true);
                $scope.bottomMenuItems[menuItem].displayItemContent = false;
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Vérifie les sites disponibles pour proposer ou non l'option de changement de site.
         */
        $scope.checkIfMoreThanOneSiteIsAvailable = function() {
            $scope.siteSelectionEnable = (Smartgeo.get('availableLocalSites') > 1) || (Smartgeo.get('online') && Smartgeo.get('availableRemoteSites') > 1);
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            return $scope.siteSelectionEnable;
        };

        /**
         * @method
         * @memberOf menuController
         * @param {object} item Element du menu
         * @desc Execute une méthode du scope. Utilisé pour créer dynamiquement le menu en y associant des actions.
         */
        $scope.execute = function(item) {
            if ($scope[item.action]) {
                return $scope[item.action]();
            } else {
                $scope.showItem(item);
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @param {object} item Element du menu
         * @desc Ouvre un élement du menu
         */
        $scope.showItem = function(item) {
            for (var menuItem in $scope.menuItems) {
                $scope.menuItems[menuItem].displayMenuItem = false;
                $scope.menuItems[menuItem].displayItemContent = false;
            }
            item.displayItemContent = true;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Retourne à la racine du menu
         */
        $scope.home = function() {
            for (var menuItem in $scope.menuItems) {
                $scope.menuItems[menuItem].displayMenuItem = true;
                $scope.menuItems[menuItem].displayItemContent = false;
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Demande la confirmation de déconnexion pour se rendre à la page d'accueil'
         */
        $scope.logout = function() {
            alertify.confirm("Voulez vous QOUITTER l'application", function(yes) {
                if (!yes) {
                    return;
                }
                $location.path('/');
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Demande la confirmation de déconnexion pour se rendre à la page de sélection de site
         */
        $scope.changeSite = function() {
            alertify.confirm("Voulez vous QOUITTER l'application ou changer de site", function(yes) {
                if (!yes) {
                    return;
                }
                $location.path('/sites/');
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Active la consultation
         */
        $scope.activateConsultation = function() {
            $rootScope.$broadcast("ACTIVATE_CONSULTATION");
            $scope.display = false;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Active la fonction 'Ma position'
         */
        $scope.activatePosition = function() {
            $rootScope.$broadcast("ACTIVATE_POSITION");
            $scope.display = false;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Ouvre le menu
         */
        $rootScope.showLeftMenu = $scope.showMenu = function() {
            $scope.display = true;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Ferme le menu
         */
        $rootScope.hideLeftMenu = $scope.hideMenu = function() {
            $scope.display = false;
        };

    }

]);