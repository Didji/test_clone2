angular.module("smartgeomobile").controller("siteInstallController", [
    "$scope",
    "$rootScope",
    "$routeParams",
    "$http",
    "$location",
    "G3ME",
    "Installer",
    "Storage",
    "Site",
    "Utils",
    "Authenticator",
    function($scope, $rootScope, $routeParams, $http, $location, G3ME, Installer, Storage, Site, Utils, Authenticator) {
        "use strict";

        $rootScope.currentPage = "Installation";
        G3ME.resetMap();
        Storage.remove("persistence.menu");

        $scope.steps = [
            {
                color: "#fd9122",
                progress: 0,
                target: 100
            }
        ];
        $scope.totalProgress = 100;
        $scope.sites = Storage.get_("sites") || {};
        $scope.Math = Math;

        // Variables nécessaires à l'affichage du tableau de log des perf
        $scope.showLogTable = false;
        $scope.progress_asset = new Array();
        $scope.toggleLogTable = toggleLogTable;

        /* Si le site est déjà installé, on ne le reinstalle pas (#132), on retourne sur la carte */
        if ($scope.sites[$routeParams.site] && !!$scope.sites[$routeParams.site].installed) {
            $location.path("/map/" + $routeParams.site);
        }

        var stepsByOkey = {};

        $scope.$on("$locationChangeStart", function(event, next) {
            if (next.indexOf("/map/") === -1) {
                event.preventDefault();
            }
        });

        function toggleLogTable() {
            $scope.showLogTable = !$scope.showLogTable;
        }

        function buildSteps(site) {
            var steps = [],
                step,
                n = site.number,
                i;

            $scope.totalProgress = 1 * n.total;
            for (i in n) {
                if (i !== "number") {
                    step = stepsByOkey[i] = {
                        progress: 0,
                        target: 1 * n[i],
                        okey: i
                    };
                    steps.push(step);
                }
            }
            rainbow(steps);

            $scope.steps = steps;
        }

        function rainbow(steps) {
            var phase = (Math.PI * 2) / 3,
                center = 128,
                width = 127,
                frequency = (Math.PI * 2) / steps.length,
                red,
                green,
                blue;
            for (var i = 0, lim = steps.length; i < lim; ++i) {
                red = Math.round(Math.sin(frequency * i + 2 + phase) * width + center);
                green = Math.round(Math.sin(frequency * i + 0 + phase) * width + center);
                blue = Math.round(Math.sin(frequency * i + 4 + phase) * width + center);
                steps[i].color = "rgb(" + [red, green, blue] + ")";
            }
        }

        var url = Utils.getServiceUrl("gi.maintenance.mobility.site.json");

        document.addEventListener(
            "deviceready",
            function() {
                // Empeche le verrouillage de l'appareil pendant l'installation
                window.powermanagement.acquire();
            },
            false
        );

        $http.get(url).success(function(sites) {
            for (var i in sites) {
                if (!$scope.sites[sites[i].id]) {
                    $scope.sites[sites[i].id] = sites[i];
                }
                if (sites[i].id === $routeParams.site) {
                    $scope.site = sites[i];
                }
            }
            $scope.site = $scope.site || sites[0];
            $scope.steps[0].progress = 50;
            Authenticator.selectSiteRemotely($routeParams.site, function() {
                Installer.getInstallJSON($scope.site, function(site) {
                    $scope.steps[0].progress = 100;
                    var formatedSite = Installer.formatSiteMetadata(site);
                    buildSteps(formatedSite);
                    angular.extend($scope.site, formatedSite);
                    Installer.createZones($scope.site, function() {
                        Installer.checkInstall($scope.site, function() {
                            Installer.install($scope.site, $scope.site.stats, function() {
                                $scope.site.installed = true;
                                Site.current = $scope.site;

                                Installer.saveSite($scope.site, function() {
                                    $location.path("/map/" + $routeParams.site);
                                    if (!$scope.$$phase) {
                                        $scope.$apply();
                                    }
                                    document.addEventListener(
                                        "deviceready",
                                        function() {
                                            // le listener sur deviceReady est OBLIGATOIRE pour cette fonctionnalité
                                            window.powermanagement.release();
                                        },
                                        false
                                    );
                                });
                            });
                        });
                    });
                });
            });
        });

        $scope.$on("_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", function(event, action) {
            $scope.currentInstalledOkey = action.okey;
            // On vérifie si la variable d'action contient bien les infos nécessaires
            // à l'affichage du tableau de log
            if ("progress_asset" in action) {
                // On fixe à 5 le nombre de ligne du tableau
                if ($scope.progress_asset.length > 4) {
                    // Si le tableau est complet, on supprime le dernier element
                    $scope.progress_asset.pop();
                }
                // On insert le log le plus récent en première position
                $scope.progress_asset.unshift({
                    message: action.progress_asset.message,
                    time: parseFloat(action.progress_asset.time).toFixed(2)
                });
            }
            stepsByOkey[action.okey].progress = 1 * action.progress;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    }
]);
