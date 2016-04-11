(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Smartgeo', SmartgeoFactory);

    SmartgeoFactory.$inject = [ "$rootScope", "$location", "$window", "Storage", "Intents", "LicenseManager", "Authenticator" ];

    function SmartgeoFactory($rootScope, $location, $window, Storage, Intents, LicenseManager, Authenticator) {

        /**
         * @class SmartgeoFactory
         * @desc Factory de la classe Smartgeo
         */

        var Smartgeo = {};
        var listeners = {};

        Smartgeo._SMARTGEO_MOBILE_VERSION = '';

        Smartgeo._SIDE_MENU_WIDTH = null;

        Smartgeo._initialize = function() {
            Smartgeo._SMARTGEO_MOBILE_VERSION = $rootScope.version = window.smargeomobileversion + (window.smargeomobilebuild && window.smargeomobilebuild.length ? "-" + window.smargeomobilebuild : '');
            Smartgeo._SIDE_MENU_WIDTH = ($window.outerWidth || $window.screen.width) > 361 ? 300 : ($window.outerWidth || $window.screen.width) * 0.8;

            // TODO: Vérifier si on en a vraiment besoin, et si oui comment s'en passer
            window.Smartgeo = Smartgeo;
            console.log('on initialize');
            // si au lancement de l'application on est deja connecté
            if(window.navigator.onLine){
                console.log("on test le online true");
                 Smartgeo._onlineTask();
            }

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
        };

        // surveille le changement d'etat de connection, et le click sur le bouton retour;
        Smartgeo._initializeGlobalEvents = function() {
            document.addEventListener('online', Smartgeo._onlineTask, false);
            document.addEventListener('offline', Smartgeo._offlineTask, false);
            document.addEventListener('backbutton', Smartgeo._onBackKeyDown, false);
        };

        Smartgeo._addEventListener = function(eventName, listener) {
            if ( !listeners[eventName] ) {
                listeners[eventName] = [];
            }
            listeners[eventName].push( listener );
        };

        Smartgeo._removeEventListener = function(eventName, listener) {
            if ( !listeners[eventName] ) {
                return;
            }
            listeners[eventName].splice( listeners[eventName].indexOf(listener), 1 );
        };

        //listen online mode
        Smartgeo._onlineTask = function() {
            Storage.set('online', true);
            $rootScope.$broadcast("DEVICE_IS_ONLINE");
            console.info("_SMARTGEO_ONLINE");
            Authenticator.silentLogin();
        };

        //listen offline mde
        Smartgeo._offlineTask = function() {
            Storage.set('online', false);
            $rootScope.$broadcast("DEVICE_IS_OFFLINE");
            console.info("_SMARTGEO_OFFLINE");
        };

        // Handle the back button
        Smartgeo._onBackKeyDown = function(e) {
            for ( var i in listeners['backbutton'] ) {
                listeners['backbutton'][i]();
            }
        };

        // Handle Intents
        Smartgeo._onIntent = function(url) {
            Smartgeo._isConnected();
            $rootScope.fromIntent = true;
            window.plugins.launchmyapp.setActivity(LicenseManager.intent);
            $location.url(Intents.parse(url));
            $rootScope.$digest();
        };

        // Handle Connection
        Smartgeo._isConnected = function(value) {
            GoogleGi.isConnected(value,
            function(result) {
                window.connected = result;
            }, function(error) {
                window.connected = false;
            });
            return window.connected;
        };

        return Smartgeo;
    }
})();
