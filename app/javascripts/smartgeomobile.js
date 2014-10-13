/*global window, angular, navigator, SmartgeoChromium, document, console, Camera, $  */

angular
    .module("smartgeomobile", ["ngRoute", "ui.bootstrap", "ui.select2", 'pasvaz.bindonce', 'ngResource','localytics.directives'])
    .config(config).run(function($rootScope /*, LicenseManager*/ ) {
        // TODO: activer la licence + changer l'url du serveur dans app/javascripts/services/G3licService.js + supprimer la ligne suivante
        $rootScope.rights = {
            census: true,
            consultation: true,
            search: true,
            logout: true,
            report: true,
            parameters: true,
            planning: true,
            history: false,
            photo: true,
            media: true,
            myposition: true,
            activelayers: true,
            goto: true,
            synccenter: true,
            siteselection: true,
            _DONT_REALLY_RESET: false
        };
    });

config.$inject = ["$routeProvider", "$rootScopeProvider", "$httpProvider", "$provide", "$locationProvider"];

function config($routeProvider, $rootScope, $httpProvider, $provide, $locationProvider) {

    var prefetchPromise = {
        prefetchedlocalsites: ['Site', 'Smartgeo',
            function(Site, Smartgeo) {
                return Site.all();
            }
        ]
    };

    $routeProvider.
    when("/", {
        templateUrl: "partials/authentification.html",
        controllerAs: 'authController',
        controller: 'AuthController',
        resolve: prefetchPromise
    }).
    when("/sites/", {
        templateUrl: "partials/sites.html",
        controllerAs: 'siteListController',
        controller: 'SiteListController',
        resolve: prefetchPromise
    }).
    when("/report/:site//:assets/:mission", {
        templateUrl: "partials/activitySelector.html",
        controllerAs: 'activitySelectorController',
        controller: 'ActivitySelectorController',
        resolve: prefetchPromise
    }).
    when("/report/:site/:activity/:assets", {
        templateUrl: "partials/report.html",
        controllerAs: 'reportController',
        controller: 'ReportController',
        resolve: prefetchPromise
    }).
    when("/report/:site/:activity/:assets/:mission", {
        templateUrl: "partials/report.html",
        controllerAs: 'reportController',
        controller: 'ReportController',
        resolve: prefetchPromise
    }).
    when("/register", {
        templateUrl: "partials/register.html"
    }).
    when("/licenseRevoked", {
        templateUrl: "partials/licenseRevoked.html"
    }).

    when("/sites/install/:site", {
        templateUrl: "partials/installation.html"
    }).
    when("/sites/uninstall/:site", {
        templateUrl: "partials/uninstall.html",
        controllerAs: 'siteRemoveController',
        controller: 'SiteRemoveController',
        resolve: prefetchPromise
    }).
    when("/sites/update/:site", {
        templateUrl: "partials/update.html"
    }).
    when("/map/:site", {
        templateUrl: "partials/main.html",
        resolve: prefetchPromise
    }).
    when("/intent/:controller/?:args", {
        templateUrl: "partials/intent.html"
    }).
    otherwise({
        template: " ",
        controller: function($location) {
            $location.path("/");
        }
    });

    $provide.factory('myHttpInterceptor', function($q, $injector) {
        return {
            'responseError': function(rejection) {
                var Smartgeo = $injector.get('Smartgeo');
                var $location = $injector.get('$location');
                var $http = $injector.get('$http');
                if (rejection.status === 403 && $location.path() !== "/" && rejection.config.url.indexOf('global.auth') === -1) {
                    Smartgeo.silentLogin();
                    return $http(rejection.config);
                }
                return $q.reject(rejection);
            }
        };
    });

    $httpProvider.interceptors.push('myHttpInterceptor');
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.cache = false;
}
