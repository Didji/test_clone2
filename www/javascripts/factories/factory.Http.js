(function() {
    "use strict";

    angular.module("smartgeomobile").factory("Http", HttpFactory);

    HttpFactory.$inject = ["$http", "$q", "Storage"];

    function HttpFactory($http, $q, Storage) {
        /**
         * @class HttpFactory
         * @desc Http permet de surcharger le service $http et vérifie si l'appli est en ligne avant d'envoyer des requêtes
         */

        var Http = {};

        /**
         * @name http
         * @desc Surcharge $http et retourne une promesse
         */
        Http.http = function(config) {
            config.method = config.method || "GET";
            config.url = config.url || "";
            return $q(function(resolve, reject) {
                if (!Storage.get("online")) {
                    return reject("Device is offline.", 400);
                } else {
                    return $http(config).then(function(res) {
                        resolve(res.data);
                    }, reject);
                }
            });
        };

        /**
         * @name get
         * @desc Surcharge $http.get et retourne une promesse
         */
        Http.get = function(url, config) {
            config = config || {};
            config.method = "GET";
            config.url = url;
            return Http.http(config);
        };

        /**
         * @name get
         * @desc Surcharge $http.post et retourne une promesse
         */
        Http.post = function(url, data, config) {
            config = config || {};
            config.method = "POST";
            config.url = url;
            config.data = data;
            return Http.http(config);
        };

        /**
         * @name get
         * @desc Surcharge $http.put et retourne une promesse
         */
        Http.put = function(url, data, config) {
            config = config || {};
            config.method = "PUT";
            config.url = url;
            config.data = data;
            return Http.http(config);
        };

        return Http;
    }
})();
