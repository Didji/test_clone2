(function() {
    "use strict";

    angular.module("smartgeomobile").controller("SiteListController", SiteListController);

    SiteListController.$inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "i18n",
        "Storage",
        "prefetchedlocalsites",
        "Site",
        "Utils",
        "Authenticator",
        "G3ME"
    ];

    /**
     * @class SiteListController
     * @desc Controlleur de la page de selection de site.
     *
     * @property {Boolean} ready Les sites sont ils chargés
     * @property {Boolean} online Etat de l'application
     * @property {Array} sites Sites chargés
     */

    function SiteListController(
        $scope,
        $rootScope,
        $http,
        $location,
        i18n,
        Storage,
        prefetchedlocalsites,
        Site,
        Utils,
        Authenticator,
        G3ME
    ) {
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
            $rootScope.currentPage = "Sélection de site";

            vm.ready = false;
            vm.online = Storage.get("online");

            if (vm.online) {
                getRemoteSites(prefetchedlocalsites || {});
            } else {
                getLocalSites();
            }
        }

        /**
         * @name getRemoteSites
         * @desc Récupère la liste des sites sur le serveur
         */
        function getRemoteSites(knownSites) {
            var url = Utils.getServiceUrl("gi.maintenance.mobility.site.json");
            $http
                .get(url)
                .success(function(sites) {
                    var sitesById = {},
                        site,
                        tmpsites = {};
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
                    vm.sites.sort(function(a, b) {
                        if (a.label.toLowerCase() < b.label.toLowerCase()) return -1;
                        if (a.label.toLowerCase() > b.label.toLowerCase()) return 1;
                        return 0;
                    });
                    vm.ready = true;
                })
                .error(function() {
                    // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                    vm.sites = [];
                    for (var id in knownSites) {
                        vm.sites.push(knownSites[id]);
                    }
                    vm.sites.sort(function(a, b) {
                        if (a.label.toLowerCase() < b.label.toLowerCase()) return -1;
                        if (a.label.toLowerCase() > b.label.toLowerCase()) return 1;
                        return 0;
                    });
                    vm.ready = true;
                });
        }

        /**
         * @name getLocalSites
         * @desc Récupère la liste des sites locaux
         */
        function getLocalSites() {
            var knownSites = prefetchedlocalsites || {};

            // Pour que les filtres fonctionnent, il nous faut un simple tableau.
            vm.sites = [];
            for (var id in knownSites) {
                vm.sites.push(knownSites[id]);
            }
            vm.sites.sort(function(a, b) {
                if (a.label.toLowerCase() < b.label.toLowerCase()) return -1;
                if (a.label.toLowerCase() > b.label.toLowerCase()) return 1;
                return 0;
            });
            vm.ready = true;
        }

        /**
         * @name select
         * @desc Selectionne un site sur le serveur
         * @param {Object} site Site à selectionner
         */
        function select(site) {
            Site.current = site;
            vm.ready = false;
            Authenticator.selectSiteRemotely(
                site.id,
                function() {
                    redirect(site);
                },
                function() {
                    redirect(site);
                }
            );
        }

        /**
         * @name redirect
         * @desc Redirige vers charge la carte
         * @param {Object} site Site à selectionner
         */
        function redirect(site) {
            G3ME.resetMap();
            Utils.clearPersistence();
            $location.path("/map/" + site.id);
        }

        /**
         * @name confirmUninstallSite
         * @desc Demande confirmation avant de lancer la page de désinstallation de site
         * @param {Object} site Site à désinstaller
         */
        function confirmUninstallSite(site) {
            alertify.confirm(i18n.get("_SYNC_UNINSTALL_CONFIRM_MESSAGE_", site.label), function(yes) {
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
            $location.path("sites/uninstall/" + site.id);
            $scope.$apply();
        }
    }
})();
