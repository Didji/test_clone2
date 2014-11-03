(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'SQLite', SQLiteFactory );

    function SQLiteFactory() {

        /**
         * @class SQLiteFactory
         * @desc Factory de la classe SQLite
         */

        var SQLite = {
            DATABASE_SIZE: 1024 * 1024 * 4,
            DATABASE_VERSION: '0.0.1-angular',
            DATABASES: {}
        };

        /**
         * @name openDatabase
         * @desc Ouvre une base de données et la met en cache
         * @param {Object} args
         */
        SQLite.openDatabase = function(args) {
            if (!SQLite.DATABASES[args.name]) {
                if (window.sqlitePlugin) {
                    SQLite.DATABASES[args.name] = window.sqlitePlugin.openDatabase( {
                        name: args.name,
                        bgType: 1
                    } );
                } else {
                    SQLite.DATABASES[args.name] = openDatabase( args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE );
                }
            }
            return SQLite.DATABASES[args.name];
        };

        /**
         * @name parameters
         * @desc Ouvre la base de données 'parameters'
         */
        SQLite.parameters = function() {
            return SQLite.openDatabase( {
                name: 'parameters'
            } );
        };

        /**
         * @name get
         * @desc Récupére une valeur dans la base de données 'parameters'
         * @param {String} parameter
         * @param {Function} callback
         */
        SQLite.get = function(parameter, callback) {
            SQLite.parameters().transaction( function(transaction) {
                transaction.executeSql( 'SELECT p_value FROM PARAMETERS WHERE p_parameter = ? ', [parameter], function(transaction, results) {
                    if (results.rows.length === 1) {
                        (callback || function() {})( JSON.parse( results.rows.item( 0 ).p_value ) );
                    } else {
                        (callback || function() {})( undefined );
                    }
                }, function(transaction, SqlError) {
                        console.error( SqlError );
                        (callback || function() {})( undefined );
                    } );
            } );
        };

        /**
         * @name set
         * @desc Enregistre une valeur dans la base de données 'parameters'
         * @param {String} parameter
         * @param {*} value
         * @param {Function} callback
         */
        SQLite.set = function(parameter, value, callback) {
            SQLite.parameters().transaction( function(transaction) {
                transaction.executeSql( 'INSERT OR REPLACE INTO PARAMETERS(p_parameter, p_value) VALUES (?, ?)', [parameter, JSON.stringify( value )], function() {
                    (callback || function() {})();
                }, function(transaction, SqlError) {
                        console.error( SqlError );
                        (callback || function() {})( undefined );
                    } );
            } );
        };

        /**
         * @name unset
         * @desc Supprime une valeur dans la base de données 'parameters'
         * @param {String} parameter
         * @param {Function} callback
         */
        SQLite.unset = function(parameter, callback) {
            SQLite.parameters().transaction( function(transaction) {
                transaction.executeSql( 'DELETE FROM PARAMETERS WHERE p_parameter = ? ', [parameter], function() {
                    (callback || function() {})();
                }, function(transaction, SqlError) {
                        console.error( SqlError );
                        (callback || function() {})();
                    } );
            } );
        };

        /**
         * @name exec
         * @desc Execute une requête
         * @param {String} database
         * @param {String} request
         * @param {Array} args
         * @param {Function} callback
         */
        SQLite.exec = function(database, request, args, callback) {
            SQLite.openDatabase( {
                name: database
            } ).transaction( function(t) {
                t.executeSql( request, args || [], function(t, r) {
                    callback( r.rows );
                }, function() {
                        console.error( arguments[1], request, args || [] );
                    } );
            }, function() {
                    console.error( arguments );
                } );
        };

        /**
         * @name initialize
         * @desc Crée la base de données 'parameters' et ses index
         */
        SQLite.initialize = function() {
            SQLite.parameters().transaction( function(transaction) {
                transaction.executeSql( 'CREATE TABLE IF NOT EXISTS PARAMETERS (p_parameter unique, p_value)' );
                transaction.executeSql( 'CREATE INDEX IF NOT EXISTS INDEX_PARAMETER ON PARAMETERS (p_parameter)' );
            } );
        };

        SQLite.initialize();

        return SQLite;
    }

})();
