/**
 * @class       menuController
 * @classdesc   Controlleur du menu
 *
 * @property {boolean} display Visibilité du menu
 * @property {boolean} siteSelectionEnable Visibilité du bouton de selection de site
 * @property {array} menuItems Item du menu
 * @property {array} bottomMenuItems Item du menu fix
 */

angular.module('smartgeomobile').controller('menuController', ["$scope", "$routeParams", "$window", "$rootScope", "Smartgeo", "i18n", "$timeout", "$http", "$location", "$filter",
    function($scope, $routeParams, $window, $rootScope, Smartgeo, i18n, $timeout, $http, $location, $filter) {

        'use strict';

        var vm = $scope;

        /**
         * @method
         * @memberOf menuController
         * @desc Methode d'initialisation, appelée après le chargement du DOM
         */
        vm.initialize = function() {
            vm.persistence = Smartgeo.get("persistence.menu");

            vm.display = true;

            vm.homeIsDisplayed = true;

            vm.siteSelectionEnable = false;

            vm.menuItems = [{
                id: 'search',
                label: i18n.get('_MENU_SEARCH'),
                icon: "fa fa-search",
                template: 'partials/search.html',
                forceLoadDOM: false
            }, {
                id: 'planning',
                label: i18n.get('_MENU_PLANNING'),
                icon: "fa fa-calendar",
                template: 'partials/planning.html',
                forceLoadDOM: true
            }, {
                id: 'census',
                label: i18n.get('_MENU_CENSUS'),
                icon: "fa fa-plus",
                template: 'partials/census.html',
                forceLoadDOM: false
            }, {
                id: 'activelayers',
                label: i18n.get('_MENU_ACTIVE_LAYERS'),
                icon: "fa fa-list-ul",
                template: 'partials/layers.html',
                forceLoadDOM: false
            }, {
                id: 'synccenter',
                label: i18n.get('_MENU_SYNC'),
                badge: 'toBeSync',
                icon: "fa fa-refresh",
                template: 'partials/synchronizationMenu.html',
                forceLoadDOM: true
            }, {
                id: 'parameters',
                label: i18n.get('_MENU_PARAMETERS'),
                icon: "fa fa-cogs",
                template: 'partials/parameters.html',
                forceLoadDOM: false
            }];

            vm.bottomMenuItems = [{
                id: 'logout',
                label: 'Déconnexion',
                icon: "fa fa-power-off redicon",
                action: 'logout',
            }, {
                id: 'siteselection',
                label: 'Selection de site',
                icon: "fa fa-exchange",
                action: 'changeSite',
                specialVisibility: 'checkIfMoreThanOneSiteIsAvailable'
            }, {
                id: 'myposition',
                label: 'Ma position',
                icon: "fa fa-compass",
                action: 'activatePosition',
            }, {
                id: 'consultation',
                label: 'Consultation',
                icon: "fa fa-info-circle",
                action: 'activateConsultation',
            }];

            vm.applyVisibility();

            $rootScope.$on('DEVICE_IS_ONLINE', vm.checkIfMoreThanOneSiteIsAvailable);
            $rootScope.$on('DEVICE_IS_OFFLINE', vm.checkIfMoreThanOneSiteIsAvailable);
            $rootScope.$on('_MENU_CLOSE_', function() {
                vm.display = false;
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            });

            vm.checkIfMoreThanOneSiteIsAvailable();

            $rootScope.$watch('reports', function(event) {

                vm.toSyncNumber = 0;

                if ($rootScope.reports && $rootScope.reports._byUUID) {
                    for (var uuid in $rootScope.reports._byUUID) {
                        if (!$rootScope.reports._byUUID[uuid].synced) {
                            vm.toSyncNumber++;
                        }
                    }
                }
                if ($rootScope.censusAssets && $rootScope.censusAssets._byUUID) {
                    for (var uuid in $rootScope.censusAssets._byUUID) {
                        if (!$rootScope.censusAssets._byUUID[uuid].synced) {
                            vm.toSyncNumber++;
                        }
                    }
                }
            });

            vm.$watch('persistence', function(event) {
                if (null === vm.persistence) return;
                vm.display = vm.persistence.display;
                for(var menuIndex in vm.menuItems) {
                    if(vm.menuItems[menuIndex].id === vm.persistence.activeMenuId) {
                        vm.showItem(vm.menuItems[menuIndex]);
                    }
                }
            });

            $scope.$on("$destroy", function(event) {
                Smartgeo.set(
                    "persistence.menu", 
                    {
                        display: vm.display,
                        activeMenuId: $filter('filter')(vm.menuItems, {displayItemContent: true})[0].id
                    }
                );
            });
        };

        /**
         * @method
         * @memberOf menuController
         * @desc
         */
        vm.toggleDisplay = function() {
            vm.display = !vm.display;
            if (vm.display && Smartgeo.isRunningOnLittleScreen()) {
                $rootScope.$broadcast("CLOSE_CONSULTATION_PANEL");
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Applique la visibilité aux éléments du menu en fonction des droits et de l'attribut 'specialVisibility' s'il est défini.
         */
        vm.applyVisibility = function() {
            for (var menuItem in vm.menuItems) {
                vm.menuItems[menuItem].displayMenuItem = (vm.menuItems[menuItem].specialVisibility ? vm[vm.menuItems[menuItem].specialVisibility]() : true);
                vm.menuItems[menuItem].displayItemContent = false;
            }

            for (var menuItem in vm.bottomMenuItems) {
                vm.bottomMenuItems[menuItem].displayMenuItem = (vm.bottomMenuItems[menuItem].specialVisibility ? vm[vm.bottomMenuItems[menuItem].specialVisibility]() : true);
                vm.bottomMenuItems[menuItem].displayItemContent = false;
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Vérifie les sites disponibles pour proposer ou non l'option de changement de site.
         */
        vm.checkIfMoreThanOneSiteIsAvailable = function() {
            vm.siteSelectionEnable = (Smartgeo.get('availableLocalSites') > 1) || (Smartgeo.get('online') && Smartgeo.get('availableRemoteSites') > 1);
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            return vm.siteSelectionEnable;
        };

        /**
         * @method
         * @memberOf menuController
         * @param {object} item Element du menu
         * @desc Execute une méthode du scope. Utilisé pour créer dynamiquement le menu en y associant des actions.
         */
        vm.execute = function(item) {
            if (vm[item.action]) {
                return vm[item.action]();
            } else {
                vm.showItem(item);
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @param {object} item Element du menu
         * @desc Ouvre un élement du menu
         */
        vm.showItem = function(item) {
            vm.homeIsDisplayed = false;
            for (var menuItem in vm.menuItems) {
                vm.menuItems[menuItem].displayMenuItem = false;
                vm.menuItems[menuItem].displayItemContent = false;
            }
            item.displayItemContent = true;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Retourne à la racine du menu
         */
        vm.home = function() {
            vm.homeIsDisplayed = true;
            for (var menuItem in vm.menuItems) {
                vm.menuItems[menuItem].displayMenuItem = true;
                vm.menuItems[menuItem].displayItemContent = false;
            }
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Demande la confirmation de déconnexion pour se rendre à la page d'accueil'
         */
        vm.logout = function() {
            alertify.confirm(i18n.get('_CONFIRM_DISCONNECT_'), function(yes) {
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
        vm.changeSite = function() {
            alertify.confirm(i18n.get('_CONFIRM_CHANGE_SITE_'), function(yes) {
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
        vm.activateConsultation = function() {
            $rootScope.$broadcast("ACTIVATE_CONSULTATION");
            vm.display = false;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Active la fonction 'Ma position'
         */
        vm.activatePosition = function() {
            $rootScope.$broadcast("ACTIVATE_POSITION");
            vm.display = false;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Ouvre le menu
         */
        $rootScope.showLeftMenu = vm.showMenu = function() {
            vm.display = true;
        };

        /**
         * @method
         * @memberOf menuController
         * @desc Ferme le menu
         */
        $rootScope.hideLeftMenu = vm.hideMenu = function() {
            vm.display = false;
        };

    }

]);