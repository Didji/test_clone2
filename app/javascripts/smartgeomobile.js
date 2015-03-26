angular
    .module( "smartgeomobile", ["ngRoute", "ui.bootstrap", 'ngResource', 'localytics.directives', 'ngTouch', 'ngSanitize'] )
    .config( config ).run( function(LicenseManager, Storage, $rootScope, Authenticator, $window) {

    "use strict";
    var Smartgeo = {

        _initializeGlobalEvents: function() {
            window.addEventListener( 'online', Smartgeo._onlineTask, false );
            window.addEventListener( 'offline', Smartgeo._offlineTask, false );

            if (!window.ChromiumCallbacks) {
                window.ChromiumCallbacks = {};
            }

            window.ChromiumCallbacks[20] = Smartgeo._onlineTask;
            window.ChromiumCallbacks[21] = Smartgeo._offlineTask;
        },

        _onlineTask: function() {
            setTimeout( function() {
                Storage.set( 'online', true );
                $rootScope.$broadcast( "DEVICE_IS_ONLINE" );
                console.info(( "_SMARTGEO_ONLINE" ));
                Authenticator.silentLogin();
            }, 1000 );
        },

        _offlineTask: function() {
            Storage.set( 'online', false );
            $rootScope.$broadcast( "DEVICE_IS_OFFLINE" );
            console.info(( "_SMARTGEO_OFFLINE" ));
        }

    };
    Smartgeo._SMARTGEO_MOBILE_VERSION = $rootScope.version = window.smargeomobileversion + (window.smargeomobilebuild && window.smargeomobilebuild.length ? "-" + window.smargeomobilebuild : '');
    Smartgeo._SIDE_MENU_WIDTH = ($window.outerWidth || $window.screen.width) > 361 ? 300 : ($window.outerWidth || $window.screen.width) * 0.8;

    Smartgeo._initializeGlobalEvents();

    if (window.SmartgeoChromium) {
        window.ChromiumCallbacks[13] = function(path) {
            if (path) {
                Storage.set( 'tileRootPath', path );
            } else {
                SmartgeoChromium.getExtApplicationDirectory();
            }
        };
        SmartgeoChromium.getExtApplicationDirectory();
    }
    window.Smartgeo = Smartgeo ;
} );

config.$inject = ["$routeProvider", "$httpProvider", "$provide"];

function config($routeProvider, $httpProvider, $provide) {

    "use strict" ;

    var prefetchPromise = {
        prefetchedlocalsites: ['Site', '$route', function(Site, $route) {
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
        when( "/report/:site//:assets/:mission?", {
            templateUrl: "partials/activitySelector.html",
            controllerAs: 'activitySelectorController',
            controller: 'ActivitySelectorController',
            resolve: prefetchPromise
        } ).
        when( "/report/:site/:activity/:assets/:mission?", {
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
                var Authenticator = $injector.get( 'Authenticator' );
                var $location = $injector.get( '$location' );
                var $http = $injector.get( '$http' );
                if (rejection.status === 403 && $location.path() !== "/" && rejection.config.url.indexOf( 'global.auth' ) === -1) {
                    Authenticator.silentLogin();
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
