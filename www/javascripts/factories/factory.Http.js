(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Http', HttpFactory );

    HttpFactory.$inject = ["$http", "$q", "Storage"];


    function HttpFactory($http, $q, Storage) {

        /**
         * @class HttpFactory
         * @desc Http permet de surcharger le service $http et vérifie si l'appli est en ligne avant d'envoyer des requêtes
         */

        var Http = {};

        /**
         * @name get
         * @desc Surcharge $http.get et retourne une promesse
         */
        Http.get = function( url, config ) {
            return $q( function(resolve, reject) {
                if ( !Storage.get('online') ) {
                    return reject('Device is offline.', 400);
                } else {
                    return $http.get( url, config ).then(resolve, reject);
                }
            });
        };

        /**
         * @name get
         * @desc Surcharge $http.post et retourne une promesse
         */
        Http.post = function( url, data, config ) {
            return $q( function(resolve, reject) {
                if ( !Storage.get('online') ) {
                    return reject('Device is offline.', 400);
                } else {
                    return $http.post( url, data, config ).then(resolve, reject);
                }
            });
        }

        /**
         * @name get
         * @desc Surcharge $http.put et retourne une promesse
         */
        Http.put = function( url, data, config ) {
            return $q( function(resolve, reject) {
                if ( !Storage.get('online') ) {
                    return reject('Device is offline.', 400);
                } else {
                    return $http.put( url, data, config ).then(resolve, reject);
                }
            });
        }

        return Http;
    }

})();
