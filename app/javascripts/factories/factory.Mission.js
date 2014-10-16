(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Mission', MissionFactory);

    MissionFactory.$inject = ["$http", "Smartgeo"];


    function MissionFactory($http, Smartgeo) {

        /**
         * @class MissionFactory
         * @desc Factory de la classe Mission
         */

        var Mission = {};

        /**
         * @name query
         * @desc Requête le serveur pour récupérer les missions de l'utilisateur connecté.
         */
        Mission.query = function () {
            return $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.showOT.json'));
        };

        return Mission;
    }

})();
