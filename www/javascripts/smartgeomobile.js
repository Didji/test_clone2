angular
    .module("smartgeomobile", [
        "smartgeomobile.config",
        "ngRoute",
        "ngResource",
        "ngTouch",
        "ngSanitize",
        "ngIOS9UIWebViewPatch",
        "ui.select"
    ])
    .config(config)
    .run(function(Smartgeo) {
        "use strict";
        L.Browser.webkit3d = false;
        Smartgeo._initialize();
    });

config.$inject = ["$routeProvider", "$httpProvider", "$provide", "$compileProvider"];

function config($routeProvider, $httpProvider, $provide, $compileProvider) {
    "use strict";
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|file|blob|cdvfile|content):|data:image\//);

    var prefetchPromise = {
        prefetchedlocalsites: [
            "Site",
            "$route",
            function(Site, $route) {
                if ($route.current.params.site) {
                    return Site.get($route.current.params.site, true);
                } else {
                    return Site.all();
                }
            }
        ]
    };

    $routeProvider
        .when("/", {
            templateUrl: "partials/authentification.html",
            controllerAs: "authController",
            controller: "AuthController",
            resolve: prefetchPromise
        })
        .when("/sites/", {
            templateUrl: "partials/sites.html",
            controllerAs: "siteListController",
            controller: "SiteListController",
            resolve: prefetchPromise
        })
        .when("/report/:site//:assets/:mission?", {
            templateUrl: "partials/activitySelector.html",
            controllerAs: "activitySelectorController",
            controller: "ActivitySelectorController",
            resolve: prefetchPromise
        })
        .when("/report/:site/:activity/:assets/:mission?", {
            templateUrl: "partials/report.html",
            controllerAs: "reportController",
            controller: "ReportController",
            resolve: prefetchPromise
        })
        .when("/register", {
            templateUrl: "partials/register.html"
        })
        .when("/licenseRevoked", {
            templateUrl: "partials/licenseRevoked.html"
        })
        .when("/sites/install/:site", {
            templateUrl: "partials/installation.html"
        })
        .when("/sites/uninstall/:site", {
            templateUrl: "partials/uninstall.html",
            controllerAs: "siteRemoveController",
            controller: "SiteRemoveController",
            resolve: prefetchPromise
        })
        .when("/map/:site", {
            templateUrl: "partials/main.html",
            controllerAs: "mapController",
            controller: "MapController",
            resolve: prefetchPromise
        })
        .when("/intent/:controller/?:args", {
            template: "<div class='intent'><i class='fa fa-refresh fa-spin'></i></div>",
            controllerAs: "intentController",
            controller: "IntentController",
            resolve: prefetchPromise
        })
        .when("/oauth", {
            templateUrl: "partials/oauth.html",
            controllerAs: "oauthController",
            controller: "OauthController",
            resolve: prefetchPromise
        });

    $provide.factory("myHttpInterceptor", function($q, $injector) {
        return {
            responseError: function(rejection) {
                var Authenticator = $injector.get("Authenticator");
                var $location = $injector.get("$location");
                var $http = $injector.get("$http");
                if (
                    rejection.status === 401 &&
                    $location.path() !== "/" &&
                    rejection.config.url.indexOf("global.auth") === -1 &&
                    rejection.config.url.indexOf("gi.maintenance.mobility.site.json") === -1
                ) {
                    // Attention, le code ci-dessous est sensible.
                    // Merci de lire attentivement ce commentaire avant
                    // de le modifier.
                    //
                    // On est ici car on a fait une requête à GIMAP qui a été
                    // refusée car la session a expiré. On va tenter une
                    // authentification silencieuse, avant de rejouer la
                    // requête originale.
                    //
                    // Pour cela, il faut qu'on renvoie une promise : angular
                    // attendra la résolution de cette promise avant d'appeler
                    // le callback de la requête originale.
                    //
                    // Problème : le login silencieux n'est pas implémenté sous
                    // forme de promise. On crée donc une promise qui encapsule
                    // le login silencieux : c'est authPromise.
                    var authPromise = $q(function(resolve, reject) {
                        Authenticator.silentLogin(function() {
                            resolve();
                        });
                        // On utilise ensuite le chaînage de promises pour que, à la
                        // suite du login silencieux, on rejoue la requête originale :
                        // c'est ce que fait la fonction anonyme du then() ci-dessous.
                    }).then(function() {
                        return $http(rejection.config);
                    });

                    //
                    // Au final, on renvoie les promises chaînées.
                    return authPromise;
                }
                return $q.reject(rejection);
            }
        };
    });

    $httpProvider.interceptors.push("myHttpInterceptor");
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.cache = false;
}
