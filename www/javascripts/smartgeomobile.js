angular
    .module( "smartgeomobile", ["smartgeomobile.config", "ngRoute", "ui.bootstrap", 'ngResource', 'localytics.directives', 'ngTouch', 'ngSanitize', 'ngIOS9UIWebViewPatch'] )
    .config( config )
    .run( function(LicenseManager, Storage, $rootScope, Authenticator, $window, $location, Intents) {

    "use strict";
    L.Browser.webkit3d = false;
    var Smartgeo = {

        _initializeGlobalEvents: function() {
            document.addEventListener('online', Smartgeo._onlineTask, false);
            document.addEventListener('offline', Smartgeo._offlineTask, false);
            document.addEventListener('backbutton', Smartgeo._onBackKeyDown, false);
        },

        //listen online mode
        _onlineTask: function() {
            Storage.set('online', true);
            $rootScope.$broadcast("DEVICE_IS_ONLINE");
            console.info("_SMARTGEO_ONLINE");
            Authenticator.silentLogin();
        },

        //listen offline mde
        _offlineTask: function() {
            Storage.set('online', false);
            $rootScope.$broadcast("DEVICE_IS_OFFLINE");
            console.info("_SMARTGEO_OFFLINE");
        },

        // Handle the back button
        _onBackKeyDown: function(e) {
            if ( ($location.$$path.match(/map/) != null || $location.$$path.match(/report/) != null || $location.$$path.match(/oauth/) != null) && $rootScope.fromIntent == true ) {
                var intent = Storage.get('intent');
                Storage.remove('intent');
                $rootScope.fromIntent = false;
                if (intent != null) {
                    Storage.remove( 'intent' );
                    if (intent.report_url_redirect) {
                        window.plugins.launchmyapp.startActivity({
                            action: "android.intent.action.VIEW",
                            url: intent.report_url_redirect},
                            angular.noop,
                            angular.noop
                        );
                    } else {
                        window.plugins.launchmyapp.finishActivity(
                            {},
                            angular.noop,
                            angular.noop
                        );
                    }
                }
            }
        },

        // Handle Intents
        _onIntent: function(url) {
            Smartgeo._isConnected();
            $rootScope.fromIntent = true;
            $location.url(Intents.parse(url));
            $rootScope.$digest();
        },

        // Handle Connection
        _isConnected: function(value) {
            GoogleGi.isConnected(value,
            function(result) {
                window.connected = result;
            }, function(error) {
                window.connected = false;
            });
            return window.connected;
        }
    };


    Smartgeo._SMARTGEO_MOBILE_VERSION = $rootScope.version = window.smargeomobileversion + (window.smargeomobilebuild && window.smargeomobilebuild.length ? "-" + window.smargeomobilebuild : '');
    Smartgeo._SIDE_MENU_WIDTH = ($window.outerWidth || $window.screen.width) > 361 ? 300 : ($window.outerWidth || $window.screen.width) * 0.8;

    window.Smartgeo = Smartgeo;

    if (window.cordova) {
        document.addEventListener( "deviceready", function() {
            Smartgeo._initializeGlobalEvents();
            if ( LicenseManager.oauth ) {
                $location.url('/oauth');
                $rootScope.$apply();
            }
        } );
    } else {
        //FOR TESTING PURPOSE ONLY!!!
        //rend les événements online et offline du navigateur
        window.addEventListener( 'online', Smartgeo._onlineTask, false );
        window.addEventListener( 'offline', Smartgeo._offlineTask, false );
    }
});

config.$inject = ["$routeProvider", "$httpProvider", "$provide", "$compileProvider"];

function config($routeProvider, $httpProvider, $provide, $compileProvider) {

    "use strict";
    $compileProvider.imgSrcSanitizationWhitelist( /^\s*(https?|file|blob|cdvfile|content):|data:image\// );

    var prefetchPromise = {
        prefetchedlocalsites: ['Site', '$route', function(Site, $route) {
            if ($route.current.params.site) {
                return Site.get( $route.current.params.site, true );
            } else {
                return Site.all();
            }
        }]
    };

    $routeProvider.when( "/", {
        templateUrl: "partials/authentification.html",
        controllerAs: 'authController',
        controller: 'AuthController',
        resolve: prefetchPromise
    } ).when( "/sites/", {
        templateUrl: "partials/sites.html",
        controllerAs: 'siteListController',
        controller: 'SiteListController',
        resolve: prefetchPromise
    } ).when( "/report/:site//:assets/:mission?", {
        templateUrl: "partials/activitySelector.html",
        controllerAs: 'activitySelectorController',
        controller: 'ActivitySelectorController',
        resolve: prefetchPromise
    } ).when( "/report/:site/:activity/:assets/:mission?", {
        templateUrl: "partials/report.html",
        controllerAs: 'reportController',
        controller: 'ReportController',
        resolve: prefetchPromise
    } ).when( "/register", {
        templateUrl: "partials/register.html"
    } ).when( "/licenseRevoked", {
        templateUrl: "partials/licenseRevoked.html"
    } ).when( "/sites/install/:site", {
        templateUrl: "partials/installation.html"
    } ).when( "/sites/uninstall/:site", {
        templateUrl: "partials/uninstall.html",
        controllerAs: 'siteRemoveController',
        controller: 'SiteRemoveController',
        resolve: prefetchPromise
    } ).when( "/map/:site", {
        templateUrl: "partials/main.html",
        controllerAs: 'mapController',
        controller: 'MapController',
        resolve: prefetchPromise
    } ).when( "/intent/:controller/?:args", {
        template: "<div class='intent'><i class='fa fa-refresh fa-spin'></i></div>",
        controllerAs: 'intentController',
        controller: 'IntentController',
        resolve: prefetchPromise
    } ).when( "/oauth", {
        templateUrl: "partials/oauth.html",
        controllerAs: 'oauthController',
        controller: 'OauthController',
        resolve: prefetchPromise
    } );

    $provide.factory( 'myHttpInterceptor', function($q, $injector) {
        return {
            'responseError': function(rejection) {
                var Authenticator = $injector.get( 'Authenticator' );
                var $location = $injector.get( '$location' );
                var $http = $injector.get( '$http' );
                if (rejection.status === 403 && $location.path() !== "/"
                    && rejection.config.url.indexOf( 'global.auth' ) === -1
                    && rejection.config.url.indexOf( 'gi.maintenance.mobility.site.json' ) === -1) {

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
                    var authPromise = $q( function(resolve, reject) {
                        Authenticator.silentLogin( function() {
                            resolve();
                        } );
                    // On utilise ensuite le chaînage de promises pour que, à la
                    // suite du login silencieux, on rejoue la requête originale :
                    // c'est ce que fait la fonction anonyme du then() ci-dessous.
                    } ).then( function() {
                        return $http( rejection.config );
                    } );

                    //
                    // Au final, on renvoie les promises chaînées.
                    return authPromise;
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
