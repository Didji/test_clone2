(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'GPS', GPSFactory );

    function GPSFactory() {

        /**
         * @class GPSFactory
         * @desc Factory de la classe GPS
         */

        var GPS = {
            positionListerners: []
        };

        /**
         * @name startWatchingPosition
         * @desc Demande des mises à jour de position GPS
         * @param {Function} listener
         */
        GPS.startWatchingPosition = function(listener) {
            if (!GPS.positionListerners.length) {
                GPS.locationWatchIdentifier = navigator.geolocation.watchPosition( function(position) {
                        GPS.__positionListernersDispatchor( position.coords.longitude, position.coords.latitude, position.coords.altitude, position.coords.accuracy );
                    }, function() {}, {
                            enableHighAccuracy: true,
                            maximumAge: 0
                        } );
            } else if (GPS.positionListerners.indexOf( listener ) !== -1) {
                return false;
            }
            return GPS.positionListerners.push( listener );
        };

        /**
         * @name stopWatchingPosition
         * @desc Arrête les demandes des mises à jour de position GPS
         * @param {Function} listener
         */
        GPS.stopWatchingPosition = function(listener) {
            var index = (typeof listener === "function") ? GPS.positionListerners.indexOf( listener ) : listener;
            if (index !== -1) {
                GPS.positionListerners.splice( index );
            }
            if (!GPS.positionListerners.length) {
                navigator.geolocation.clearWatch( GPS.locationWatchIdentifier );
                
            }
        };

        /**
         * @name getCurrentLocation
         * @desc Récupère la position GPS
         * @param {Function} listener
         */
        GPS.getCurrentLocation = function(listener) {
            var index = GPS.startWatchingPosition( function(lng, lat, alt, acc) {
                GPS.stopWatchingPosition( index - 1 );
                listener( lng, lat, alt, acc );
            } );
        };

        /**
         * @name __positionListernersDispatchor
         * @private
         * @param {Number} lng
         * @param {Number} lat
         * @param {Number} alt
         * @param {Number} acc
         */
        GPS.__positionListernersDispatchor = function(lng, lat, alt, acc) {
            for (var i = 0; i < GPS.positionListerners.length; i++) {
                GPS.positionListerners[i]( lng, lat, alt, acc );
            }
        };

        /**
         * @name emptyPositionListerners
         * @desc Vide le tableau d'écouteur de position GPS
         */
        GPS.emptyPositionListerners = function() {
            for (var i = 0; i < GPS.positionListerners.length; i++) {
                GPS.stopWatchingPosition( GPS.positionListerners[i] );
            }
        };

        return GPS;
    }

})();
