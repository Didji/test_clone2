(function() {
    "use strict";

    angular.module("smartgeomobile").factory("Storage", StorageFactory);

    StorageFactory.$inject = ["$q", "SQLite"];

    function StorageFactory($q, SQLite) {
        /**
         * @class StorageFactory
         * @desc Factory de la classe Storage
         */
        var Storage = {};

        /**
         * @name set
         * @desc Enregistre une valeur dans le localStorage
         * @param {String} parameter
         * @param {*} value
         */
        Storage.set = function(parameter, value) {
            if (value) {
                localStorage.setItem(parameter, JSON.stringify(value));
                return value;
            } else {
                return Storage.remove(parameter);
            }
        };

        /**
         * @name get
         * @desc Récupère une valeur dans le localStorage
         * @param {String} parameter
         */
        Storage.get = function(parameter) {
            return JSON.parse(localStorage.getItem(parameter));
        };

        /**
         * @name remove
         * @desc Supprime une valeur dans le localStorage
         * @param {String} parameter
         */
        Storage.remove = function(parameter) {
            return localStorage.removeItem(parameter);
        };

        /**
         * @name set_
         * @desc Enregistre une valeur dans la table PARAMETERS de SQLite
         * @param {String} parameter
         * @param {*} value
         * @param {Function} callback
         */
        Storage.set_ = function(parameter, value, callback) {
            if (!value) {
                return Storage.remove_(parameter, callback);
            }
            var deferred = $q.defer();

            // Nettoyage "magique" des références cycliques.
            // @fabriceds: Ce qui est magique cassera un jour où le charme rompra.
            // @gulian: Perso j'y crois pas.
            value = JSON.parse(JSON.stringify(value));

            SQLite.set(parameter, value, function(value) {
                deferred.resolve(value);
                (callback || angular.noop)(value);
            });
            return deferred.promise;
        };

        /**
         * @name get_
         * @desc Récupère une valeur dans la table PARAMETERS de SQLite
         * @param {String} parameter
         * @param {Function} callback
         */
        Storage.get_ = function(parameter, callback) {
            var deferred = $q.defer();
            SQLite.get(parameter, function(value) {
                deferred.resolve(value);
                (callback || angular.noop)(value);
            });
            return deferred.promise;
        };

        /**
         * @name remove_
         * @desc Supprime une valeur dans la table PARAMETERS de SQLite
         * @param {String} parameter
         * @param {Function} callback
         */
        Storage.remove_ = function(parameter, callback) {
            var deferred = $q.defer();
            SQLite.unset(parameter, function(value) {
                deferred.resolve(value);
                (callback || angular.noop)(value);
            });
            return deferred.promise;
        };

        return Storage;
    }
})();
