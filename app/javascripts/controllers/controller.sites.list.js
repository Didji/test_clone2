(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('SiteListController', SiteListController);

    SiteListController.$inject = ["$rootScope", "$http", "$location", "Smartgeo", "i18n"];

    /**
     * @class SiteListController
     * @desc Controlleur de la page de selection de site.
     *
     * @property {Boolean} ready Les sites sont ils chargés
     * @property {Boolean} online Etat de l'application
     * @property {Array} sites Sites chargés
     */

    function SiteListController($rootScope, $http, $location, Smartgeo, i18n) {

        var vm = this;

        vm.select = select;
        vm.uninstallSite = uninstallSite;
        vm.confirmUninstallSite = confirmUninstallSite;

        vm.ready = false;
        vm.online = false;
        vm.sites = [];

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            window.site = $rootScope.site = undefined;
            $rootScope.currentPage = "Sélection de site";
            vm.ready = false;
            vm.online = Smartgeo.get('online');
            Smartgeo.get_('sites', function(sites){
                if (vm.online === false) {
                    getLocalSites(sites || {});
                } else {
                    getRemoteSites(sites || {});
                }
            });

        }

        /**
         * @name getRemoteSites
         * @desc Récupère la liste des sites sur le serveur
         */
        function getRemoteSites(knownSites) {
            var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.site.json');
            $http.get(url)
                .success(function(sites) {
                    var sitesById = {},
                        site, tmpsites = {};
                    for (var i = 0, lim = sites.length; i < lim; i++) {
                        site = sites[i];
                        tmpsites[site.id] = site;
                    }
                    angular.extend(tmpsites, sitesById, knownSites);
                    // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                    vm.sites = [];
                    for (var id in tmpsites) {
                        vm.sites.push(tmpsites[id]);
                    }
                    vm.ready = true;
                }).error(function(error, errorCode) {
                    // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                    vm.sites = [];
                    for (var id in knownSites) {
                        vm.sites.push(knownSites[id]);
                    }
                    vm.ready = true;
                });
        }

        /**
         * @name getLocalSites
         * @desc Récupère la liste des sites locaux
         */
        function getLocalSites() {

            var sitesById = {},
                knownSites = Smartgeo.get_('sites') || {},
                site, tmpsites = {};

            // Pour que les filtres fonctionnent, il nous faut un simple tableau.
            vm.sites = [];
            for (var id in knownSites) {
                vm.sites.push(knownSites[id]);
            }
            vm.ready = true;
            Smartgeo.set('online', true);
        }

        /**
         * @name select
         * @desc Selectionne un site sur le serveur puis charge la carte
         * @param {Object} site Site à selectionner
         */
        function select(site) {
            Smartgeo.selectSiteRemotely(site.id, function() {
                $location.path('/map/' + site.id);
            }, function() {
                $location.path('/map/' + site.id);
            });
        };

        /**
         * @name confirmUninstallSite
         * @desc Demande confirmation avant de lancer la page de désinstallation de site
         * @param {Object} site Site à désinstaller
         */
        function confirmUninstallSite(site) {
            alertify.confirm(i18n.get('_SYNC_UNINSTALL_CONFIRM_MESSAGE_', site.label), function(yes) {
                if (yes) {
                    vm.uninstallSite(site);
                }
            });
        }

        /**
         * @name uninstallSite
         * @desc Lance la page de désinstallation de site
         * @param {Object} site Site à désinstaller
         */
        function uninstallSite(site) {
            $location.path('sites/uninstall/' + site.id);
        }

    }

})();