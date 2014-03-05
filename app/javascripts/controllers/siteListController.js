angular.module('smartgeomobile').controller('siteListController', function ($scope, $rootScope, $http, $location, Smartgeo, i18n) {

    'use strict';

    window.site = $rootScope.site = undefined;

    $scope.ready = false;
    $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

    function getRemoteSites(callback) {
        var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.site.json');
        $http.get(url)
            .success(function (sites) {
                var sitesById = {},
                    knownSites = Smartgeo.get_('sites') || {},
                    site, tmpsites = {};
                for (var i = 0, lim = sites.length; i < lim; i++) {
                    site = sites[i];
                    tmpsites[site.id] = site;
                }
                angular.extend(tmpsites, sitesById, knownSites);
                // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                $scope.sites = [];
                for (var id in tmpsites) {
                    $scope.sites.push(tmpsites[id]);
                }
                autoLoadOrNot();
                $scope.ready = true;
                (callback || function () {})(true);
            }).error(function (error, errorCode) {
                var knownSites = Smartgeo.get_('sites') || {};
                // Pour que les filtres fonctionnent, il nous faut un simple tableau.
                $scope.sites = [];
                for (var id in knownSites) {
                    $scope.sites.push(knownSites[id]);
                }
                autoLoadOrNot();
                $scope.ready = true;
                (callback || function () {})(false);
            });
    }

    function getLocalSites() {

        var sitesById = {},
            knownSites = Smartgeo.get_('sites') || {},
            site, tmpsites = {};

        // Pour que les filtres fonctionnent, il nous faut un simple tableau.
        $scope.sites = [];
        for (var id in knownSites) {
            $scope.sites.push(knownSites[id]);
        }
        autoLoadOrNot();
        $scope.ready = true;
        Smartgeo.set('online', true);
    }

    function autoLoadOrNot() {
        if ($scope.sites.length > 1 || !$scope.sites[0]) {
            // On a plus d'un site : on reste dans cette vue
            // pour afficher la liste des sites et laisser l'utilisateur
            // choisir.
            $scope.ready = true;
            return;
        }

        // Il n'y a qu'un seul site.
        // S'il est installé, on le charge. Sinon, on l'installe.
        var site = $scope.sites[0];
        if (site && site.installed) {
            Smartgeo.selectSiteRemotely(site.id, function(){
                $location.path('/map/' + site.id);
            },function(){
                $location.path('/map/' + site.id);
            });
        } else {
            $location.path('/sites/install/' + site.id);
        }
    }

    $scope.select = function(site){
        Smartgeo.selectSiteRemotely(site.id, function(){
            $location.path('/map/' + site.id);
        },function(){
            $location.path('/map/' + site.id);
        });
    };

    $scope.isInstalled = function (site) {
        return !!site.installed;
    };

    $scope.isUnInstalled = function (site) {
        return !site.installed;
    };
    $scope.online = Smartgeo.get('online');
    if ($scope.online === false) {
        getLocalSites()
    } else {
        getRemoteSites();
    }

    $scope.uninstallSite = function (site) {
        alertify.confirm(i18n.get('_SYNC_UNINSTALL_CONFIRM_MESSAGE_', site.label), function (e) {
            if (e) {
                $location.path('sites/uninstall/' + site.id);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

});
