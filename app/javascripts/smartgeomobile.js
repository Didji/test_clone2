/*global window, angular, navigator, SmartgeoChromium, document, console, Camera, $  */

angular.module("smartgeobootstrap", []).run(function() {
    window.smartgeoPersistenceSQLite.get('sites', function(sites) {
        window.smartgeoPersistenceCache_ = {
            sites: sites
        };
        angular.bootstrap(document, ['smartgeomobile']);
    });
});

function config($routeProvider, $rootScope, $httpProvider, $provide) {

    $routeProvider.
    when("/", {
        templateUrl: "partials/authentification.html",
        controllerAs: 'authController',
        controller: 'AuthController',
        resolve: {
            prefetchedlocalsites: ['Site', 'Smartgeo', function (Site, Smartgeo) {
                return Site.all();
            }]
        }
    }).
    when("/sites/", {
        templateUrl: "partials/sites.html",
        controllerAs: 'siteListController',
        controller: 'SiteListController'
    }).
    when("/report/:site//:assets/:mission", {
        templateUrl: "partials/activitySelector.html",
        controllerAs: 'activitySelectorController',
        controller: 'ActivitySelectorController'
    }).
    when("/report/:site/:activity/:assets", {
        templateUrl: "partials/report.html",
        controllerAs: 'reportController',
        controller: 'ReportController'
    }).
    when("/report/:site/:activity/:assets/:mission", {
        templateUrl: "partials/report.html",
        controllerAs: 'reportController',
        controller: 'ReportController'
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
        templateUrl: "partials/main.html",
        // controllerAs: 'mainController',
        // controller: 'MainController',
        resolve: {
            prefetchedlocalsites: ['Site', 'Smartgeo', function (Site, Smartgeo) {
                return Site.all();
            }]
        }
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



    // var interceptor = ['$rootScope', '$q', '$injector',
    //     function(scope, $q, $injector) {
    //         console.log("JE NE MARCHE PLUS");
    //         function success(response) {return response;}
    //         function error(response) {
    //         console.log("JE NE MARCHE PLUS");
    //             var $location = $injector.get('$location');
    //             var Smartgeo = $injector.get('Smartgeo');
    //             var $http = $injector.get('$http');
    //             console.log(response.status);
    //             if (response.status === 403 && $location.path() !== "/") {
    //                 Smartgeo.silentLogin();
    //                 return $http(response.config);
    //             }
    //             return $q.reject(response);

    //         }
    //         return function(promise) {return promise.then(success, error);}
    //     }
    // ];
    // $httpProvider.interceptors.push(interceptor);
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.cache = false;

}

config.$inject = ["$routeProvider", "$rootScopeProvider", "$httpProvider", "$provide"];

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