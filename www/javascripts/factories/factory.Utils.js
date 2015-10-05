(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Utils', UtilsFactory );

    UtilsFactory.$inject = ["$http", "Storage", "$window", "SQLite"];

    function UtilsFactory($http, Storage, $window, SQLite) {

        /**
         * @class UtilsFactory
         * @desc Factory de la classe Utils
         */
        var Utils = {};

        /**
         * @name clearPersistence
         * @desc
         */
        Utils.clearPersistence = function() {
            Storage.remove( 'persitence.menu.open' );
            Storage.remove( 'persitence.menu.open.level' );
            Storage.remove( 'persistence.menu' );
            if (!(Storage.get( 'users' ) || {})[Storage.get( 'lastUser' )]) {
                return;
            }
            var missions = Storage.get( 'missions_' + (Storage.get( 'users' ) || {})[Storage.get( 'lastUser' )].username );
            for (var i in missions) {
                missions[i].openned = false;
            }
            if (missions) {
                Storage.set( 'missions_' + (Storage.get( 'users' ) || {})[Storage.get( 'lastUser' )].username, missions );
            }
        };

        /**
         * @name pad
         * @param {Number} number
         * @desc Rajoute un 0 au nombre inférieur à 10
         */
        Utils.pad = function(number) {
            return (number < 10) ? ('0' + number) : number;
        };

        /**
         * @name lol
         * @param {string} string
         * @desc Rajoute un LOL au string passé en paramètre
         */
        Utils.lol = function(string) {
            return console.log( string + ", LOL" );
        };

        /**
         * @name yo
         * @param {string} string
         * @desc Rajoute un 'yo' au string passé en paramètre
         */
        Utils.yo = function(string) {
            return console.log( string + ", yo" );
        };

        /**
         * @name getBase64Image
         * @param {String} src
         */
        Utils.getBase64Image = function(src) {
            var img = document.createElement( "img" );
            img.src = src;
            var canvas = document.createElement( "canvas" );
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext( "2d" );
            ctx.drawImage( img, 0, 0 );
            var dataURL = canvas.toDataURL( "image/jpeg", 50 );
            return dataURL;
        };

        /**
         * @name makeControl
         * @param {String} title
         * @param {path} icon
         * @param {function} onclick
         * @desc Fonction utilitaire créant un contrôle Leaflet.
         */
        Utils.makeControl = function(title, icon, onclick) {
            var c = L.Control.extend( {
                options: {
                    position: 'topright'
                },
                onAdd: function() {
                    var container = L.DomUtil.create( 'div', 'leaflet-bar' );
                    $( container )
                        .html( '<a href="#" title="' + title + '"><span class="fa ' + icon + '"></span></a>' )
                        .on( 'click', onclick );
                    return container;
                }
            } );
            return new c();
        };


        /**
         * @name setGimapUrl
         * @param {string} url gimap server url
         * @returns {string} url setted server url
         * @desc Set Gimap serveur URL on localstorage, add **`http://`** and **`/index.php?service=`** if needed and clear localStorage
         */
        Utils.setGimapUrl = function(url) {
            if (url === null) {
                return null;
            }
            if (url.indexOf( 'http' ) === -1) {
                url = 'http://' + url;
            }
            if (url.indexOf( 'index.php?service=' ) === -1) {
                url = url + '/index.php?service=';
            }
            Utils.reset();
            Storage.set( 'url', url );
            return url;
        };

        /**
        * @name getServiceUrl
        * @desc
        */
        Utils.getServiceUrl = function(serviceName, GETParameters) {
            var url = Storage.get( 'url' );
            url += serviceName;

            for (var parameter in GETParameters) {
                if (GETParameters.hasOwnProperty( parameter )) {
                    url += '&' + parameter + '=' + GETParameters[parameter];
                }
            }

            return url;
        };

        /**
         * @name isRunningOnLittleScreen
         * @returns {boolean} is smartgeo running on little screen
         */
        Utils.isRunningOnLittleScreen = function() {
            return ($window.outerWidth < 2 * ($window.outerWidth || $window.screen.width) > 361 ? 300 : ($window.outerWidth || $window.screen.width) * 0.8);
        };

        /**
         * @name reset
         * @desc Clear localStorage
         */
        Utils.reset = function() {
            Utils.clearPersistence();
            for (var val in localStorage) {
                if (val.indexOf( "LicenseManager" ) !== 0) {
                    localStorage.removeItem( val );
                }
            }
            var sites = Storage.get_( 'sites' );
            Storage.remove_( 'sites' );
            for (var k in sites) {
                var site = sites[k];
                for (var i = 0; site.zones && i < site.zones.length; i++) {
                    SQLite.exec( site.zones[i].database_name, 'DROP TABLE IF EXISTS ASSETS', [], angular.noop );
                }
            }
            SQLite.exec( 'parameters', 'DELETE FROM PARAMETERS' );
            SQLite.exec( 'parameters', 'DELETE FROM PROJECTS' );
            SQLite.exec( 'parameters', 'DELETE FROM SYNCITEM' );
            SQLite.exec( 'parameters', 'DELETE FROM relationship' );
        };

        /**
         * @name
         * @desc
         */
        Utils.ping = function(callback) {
            callback = callback || angular.noop;
            $http.post( Utils.getServiceUrl( 'global.dcnx.json' ), {}, {
                timeout: 10000
            } )
                .success( function() {
                    Storage.set( 'online', true );
                    callback( true );
                } ).error( function() {
                Storage.set( 'online', false );
                callback( false );
            } );
        };


        return Utils;
    }

})();
