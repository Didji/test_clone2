(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Mission', MissionFactory );

    MissionFactory.$inject = ["$http", "Utils"];


    function MissionFactory($http, Utils) {

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
            return $http.get( Utils.getServiceUrl( 'gi.maintenance.mobility.showOT.json' ) );
        };

        return Mission;
    }

})();
