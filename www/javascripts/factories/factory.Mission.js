(function() {
    "use strict";

    angular.module("smartgeomobile").factory("Mission", MissionFactory);

    MissionFactory.$inject = ["Http", "Utils"];

    function MissionFactory(Http, Utils) {
        /**
         * @class MissionFactory
         * @desc Factory de la classe Mission
         */

        var Mission = {};

        /**
         * @name query
         * @desc Requête le serveur pour récupérer les missions de l'utilisateur connecté.
         */
        Mission.query = function() {
            return Http.get(Utils.getServiceUrl("gi.maintenance.mobility.showOT.json"));
        };

        return Mission;
    }
})();
