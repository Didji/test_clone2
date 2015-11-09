( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Authenticator', AuthenticatorFactory );

    AuthenticatorFactory.$inject = ["$http", "Storage", "Site", "Utils"];

    function AuthenticatorFactory($http, Storage, Site, Utils) {

        /**
         * @class AuthenticatorFactory
         * @desc Factory de la classe Authenticator
         */
        var Authenticator = {};

        /**
         * @name
         * @desc
         */
        Authenticator.silentLogin = function(callback) {
            var user = (Storage.get( 'users' ) || {})[Storage.get( 'lastUser' )];
            if (user && user.token) {
                Authenticator.login( user.token, callback );
            } else if (user && user.username && user.password) {
                Authenticator.login( user.username, user.password, callback );
            }
        };

        /**
         * @name
         * @desc
         */
        Authenticator.selectSiteRemotely = function(site, success, error) {
            if (window.SmartgeoChromium && !Storage.get( 'intent' )) {
                var user = (Storage.get( 'users' ) || {})[Storage.get( 'lastUser' )] || Storage.get( 'user' );
                ChromiumCallbacks[16] = function() {};
                if (user) {
                    SmartgeoChromium.authenticate( Utils.getServiceUrl( 'global.auth.json' ), user.username, user.password, site, user.token );
                }
            }

            var url = Utils.getServiceUrl( 'global.auth.json', {
                'app': 'mapcite',
                'site': site,
                'auto_load_map': true
            } );

            $http.post( url ).then( success || angular.noop, error || angular.noop );
        };

        /**
         * @name
         * @desc
         */
        Authenticator.login = function(login, password, success, error) {
            if (Authenticator._LOGIN_MUTEX) {
                return (error || angular.noop)();
            }

            Authenticator._LOGIN_MUTEX = true;
            var token, url;
            if (typeof password === 'function' || !password) {
                token = login;
                error = success;
                success = password;
            }
            if (token) {
                url = Utils.getServiceUrl( 'global.auth.json', {
                    'token': encodeURIComponent( token ),
                    'mobility': true
                } );
            } else {
                url = Utils.getServiceUrl( 'global.auth.json', {
                    'login': encodeURIComponent( login ),
                    'pwd': encodeURIComponent( password ),
                    'forcegimaplogin': true
                } );
            }
            $http.post( url, {}, {
                timeout: 10000
            } ).success( function(data) {
                Authenticator._LOGIN_MUTEX = false;
                if (Site.current) {
                    Authenticator.selectSiteRemotely( Site.current.id, success, error );
                } else {
                    (success || angular.noop) (data );
                }
            } ).error( function(response, status) {
                Authenticator._LOGIN_MUTEX = false;
                (error || angular.noop) ( response, status );
            } );
        };

        /**
         * @name
         * @desc
         */
        Authenticator.tokenAuth = function(token, callback, callback2) {
            var currentUser = (Storage.get( 'users' ) || {})[Storage.get( 'lastUser' )] || {};
            currentUser.token = token;
            Storage.set( 'user', currentUser );

            Authenticator.login( token, callback, function(response) {
                if ((response && response.status === 200) || !response) {
                    callback();
                } else {
                    callback2();
                }
            }, callback2 );
        };

        return Authenticator;
    }

} )();
