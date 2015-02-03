angular
    .module( "smartgeomobile", ["ngRoute", "ui.bootstrap", "ui.select2", 'ngResource', 'localytics.directives', 'ngTouch', 'ngSanitize'] )
    .config( config ).run( function($rootScope /* ,LicenseManager*/ ) {

    "use strict" ;
    // Pour activer le serveur de license :
    // Activer la licence + changer l'url du serveur dans app/javascripts/services/G3licService.js + supprimer la ligne suivante
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
        project: true,
        media: true,
        myposition: true,
        activelayers: true,
        goto: true,
        synccenter: true,
        siteselection: true,
        _DONT_REALLY_RESET: false
    };
} );

config.$inject = ["$routeProvider", "$httpProvider", "$provide"];

function config($routeProvider, $httpProvider, $provide) {

    "use strict" ;

    var prefetchPromise = {
        prefetchedlocalsites: ['Site', 'Smartgeo', '$route', function(Site, Smartgeo, $route) {
                if ($route.current.params.site) {
                    return Site.get( $route.current.params.site, true );
                } else {
                    return Site.all();
                }
            }
        ]
    };

    $routeProvider.
        when( "/", {
            templateUrl: "partials/authentification.html",
            controllerAs: 'authController',
            controller: 'AuthController',
            resolve: prefetchPromise
        } ).
        when( "/sites/", {
            templateUrl: "partials/sites.html",
            controllerAs: 'siteListController',
            controller: 'SiteListController',
            resolve: prefetchPromise
        } ).
        when( "/report/:site//:assets/:mission", {
            templateUrl: "partials/activitySelector.html",
            controllerAs: 'activitySelectorController',
            controller: 'ActivitySelectorController',
            resolve: prefetchPromise
        } ).
        when( "/report/:site/:activity/:assets", {
            templateUrl: "partials/report.html",
            controllerAs: 'reportController',
            controller: 'ReportController',
            resolve: prefetchPromise
        } ).
        when( "/report/:site/:activity/:assets/:mission", {
            templateUrl: "partials/report.html",
            controllerAs: 'reportController',
            controller: 'ReportController',
            resolve: prefetchPromise
        } ).
        when( "/register", {
            templateUrl: "partials/register.html"
        } ).
        when( "/licenseRevoked", {
            templateUrl: "partials/licenseRevoked.html"
        } ).

        when( "/sites/install/:site", {
            templateUrl: "partials/installation.html"
        } ).
        when( "/sites/uninstall/:site", {
            templateUrl: "partials/uninstall.html",
            controllerAs: 'siteRemoveController',
            controller: 'SiteRemoveController',
            resolve: prefetchPromise
        } ).
        when( "/map/:site", {
            templateUrl: "partials/main.html",
            controllerAs: 'mapController',
            controller: 'MapController',
            resolve: prefetchPromise
        } ).
        when( "/intent/:controller/?:args", {
            template: "<div class='intent'><i class='fa fa-refresh fa-spin'></i></div>",
            controllerAs: 'intentController',
            controller: 'IntentController',
            resolve: prefetchPromise
        } );

    $provide.factory( 'myHttpInterceptor', function($q, $injector) {
        return {
            'responseError': function(rejection) {
                var Smartgeo = $injector.get( 'Smartgeo' );
                var $location = $injector.get( '$location' );
                var $http = $injector.get( '$http' );
                if (rejection.status === 403 && $location.path() !== "/" && rejection.config.url.indexOf( 'global.auth' ) === -1) {
                    Smartgeo.silentLogin();
                    return $http( rejection.config );
                }
                return $q.reject( rejection );
            }
        };
    } );

    $httpProvider.interceptors.push( 'myHttpInterceptor' );
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.cache = false;
}
