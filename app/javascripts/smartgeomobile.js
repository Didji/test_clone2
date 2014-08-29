/*global window, angular, navigator, SmartgeoChromium, document, console, Camera, $  */

angular.module("smartgeobootstrap", []).run(function() {
    window.smartgeoPersistenceSQLite.get('sites', function(sites) {
        window.smartgeoPersistenceCache_ = {
            sites: sites
        };
        angular.bootstrap(document, ['smartgeomobile']);
    });
});

function config($routeProvider, $rootScope, $httpProvider) {

    $routeProvider.
    when("/", {
        templateUrl: "partials/authentification.html",
        controllerAs: 'authController',
        controller: 'AuthController'
    }).
    when("/sites/", {
        templateUrl: "partials/sites.html",
        controllerAs: 'siteListController',
        controller: 'SiteListController'
    }).

    when("/report/:site", {
        templateUrl: "partials/report.html"
    }).
    when("/report/:site/:activity", {
        templateUrl: "partials/report.html"
    }).
    when("/report/:site/:activity/:assets", {
        templateUrl: "partials/report.html"
    }).
    when("/report/:site/:activity/:assets/:mission", {
        templateUrl: "partials/report.html"
    }).

    when("/report/:site/undefined/:assets/:mission", {
        templateUrl: "partials/report.html"
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
        templateUrl: "partials/uninstall.html"
    }).
    when("/sites/update/:site", {
        templateUrl: "partials/update.html"
    }).
    when("/map/:site", {
        templateUrl: "partials/main.html"
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

    var interceptor = ['$rootScope', '$q', '$injector',
        function(scope, $q, $injector) {
            function success(response) {return response;}
            function error(response) {
                var $location = $injector.get('$location');
                var Smartgeo = $injector.get('Smartgeo');
                var $http = $injector.get('$http');
                if (response.status === 403 && $location.path() !== "/") {
                    Smartgeo.silentLogin();
                    return $http(response.config);
                }
                return $q.reject(response);

            }
            return function(promise) {return promise.then(success, error);}
        }
    ];
    $httpProvider.interceptors.push(interceptor);
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.cache = false;

}

config.$inject = ["$routeProvider", "$rootScopeProvider", "$httpProvider"];

angular
    .module("smartgeomobile", ["ngRoute", "ui.bootstrap", "ui.select2", "angularSpinner", 'pasvaz.bindonce', 'ngResource'])
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
            history: true,
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