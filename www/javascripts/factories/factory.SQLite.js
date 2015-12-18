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
            SQLite.parameters().readTransaction(function(tx) {
                if (parameter === 'sites') {
                    tx.executeSql( 'SELECT * FROM SITES ', [], function(tx, results) {
                        var sites = undefined,
                            nbSite = results.rows.length;

                        if (nbSite > 0) {
                            sites = {};
                            for (var i = 0, site; i < nbSite; i++) {
                                site = results.rows.item(i);
                                sites[site.id] = JSON.parse(site.value);
                            }
                        }
                        
                        (callback || function() {})( sites );
                    }, function(tx, err) {
                        console.error("SQL ERROR " + err.code + " on " + parameter + " : " + err.message);
                        (callback || function() {})( undefined );
                    });
                } else {
                    tx.executeSql( 'SELECT p_value FROM PARAMETERS WHERE p_parameter = ? ', [parameter], function(tx, results) {
                        if (results.rows.length === 1) {
                            (callback || function() {})( JSON.parse( results.rows.item( 0 ).p_value ) );
                        } else {
                            (callback || function() {})( undefined );
                        }
                    }, function(tx, err) {
                            console.error("SQL ERROR " + err.code + " on " + parameter + " : " + err.message);
                            (callback || function() {})( undefined );
                    });
                }
            }, function(err) {
                console.error("TX ERROR " + err.code + " on " + parameter + " : " + err.message);
            });    
        };

        /**
         * @name set
         * @desc Enregistre une valeur dans la base de données 'parameters'
         * @param {String} parameter
         * @param {*} value
         * @param {Function} callback
         */
        SQLite.set = function(parameter, value, callback) {
            if (parameter === 'sites') {
                //on doit vider la table d'abord... Sinon on ne peut pas desinstaller de site
                SQLite.parameters().transaction( function(tx) {
                    tx.executeSql('DELETE FROM SITES', [], 
                        function(tx, result) {
                            var site;
                            for (var i in value) {
                                site = value[i];
                                tx.executeSql('INSERT OR REPLACE INTO SITES(id, value) VALUES (?, ?)', 
                                    [site.id, JSON.stringify(site)], 
                                    function(tx, result) {
                                        //rien à faire, on passe au suivant
                                    }, function(tx, err) {
                                        console.error("SQL ERROR " + err.code + " on " + parameter + " : " + err.message);
                                        (callback || function() {})( undefined );
                                    });
                            }
                            (callback || function() {})(); // tout est OK!
                        }, 
                        function(tx, err) {
                            console.error("SQL ERROR " + err.code + " on " + parameter + " : " + err.message);
                            (callback || function() {})();
                        }
                    );
                }, function(err) {
                    console.error("TX ERROR " + err.code + " on " + parameter + " : " + err.message);
                });
            } else {
                 SQLite.parameters().transaction( function(tx) {
                    tx.executeSql('INSERT OR REPLACE INTO PARAMETERS(p_parameter, p_value) VALUES (?, ?)', 
                        [parameter, JSON.stringify( value )], 
                        function(tx, result) {
                            (callback || function() {})();
                        }, 
                        function(tx, err) {
                            console.error("SQL ERROR " + err.code + " on " + parameter + " : " + err.message);
                            (callback || function() {})( undefined );
                        } 
                    );
                 }, function(err) {
                    console.error("TX ERROR " + err.code + " on " + parameter + " : " + err.message);
                 });
            }    
        };

        /**
         * @name unset
         * @desc Supprime une valeur dans la base de données 'parameters', ou 'sites' si le parametre vaut 'sites'
         * @param {String} parameter
         * @param {Function} callback
         */
        SQLite.unset = function(parameter, callback) {
            SQLite.parameters().transaction( function(transaction) {
                var req = 'DELETE FROM PARAMETERS WHERE p_parameter = ? ',
                    params = [parameter];

                if (parameter === 'sites') {
                    req = 'DELETE FROM SITES ';
                    params = [];
                }

                transaction.executeSql(req, params, 
                    function() {
                        (callback || function() {})();
                    }, 
                    function(transaction, sqlError) {
                        console.error(sqlError);
                        (callback || function() {})();
                    }
                );
            });
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
            if (typeof request === 'string') {
                request = [request];
                args = [args];
            }
            callback = callback || function() {};
            var calledCallback = function() {};
            SQLite.openDatabase( {
                name: database
            } ).transaction( function(tx) {
                requestQueueExecutor(tx, request, args, callback, database);
            }, function(err) {
                console.error("TX ERROR " + err.code + " ON " + database + " : " + err.message);
            });
        };

        function requestQueueExecutor(tx, requests, args, callback, database) {
            var request = requests.pop(),
                arg = args.pop(),
                nextCallback = requests.length ?
                    function() {
                        requestQueueExecutor(tx, requests, args, callback, database);
                    } : callback;
            tx.executeSql( request, arg || [], function(tx, r) {
                nextCallback( r.rows );
            }, function(tx, err) {
                console.error("SQL ERROR " + err.code + " ON " + database + " : " + err.message);
            });

        }

        /**
         * @name initialize
         * @desc Crée la base de données 'parameters' et ses index
         */
        SQLite.initialize = function() {
            SQLite.parameters().transaction( function(transaction) {
                transaction.executeSql( 'CREATE TABLE IF NOT EXISTS PARAMETERS (p_parameter unique, p_value)' );
                transaction.executeSql( 'CREATE INDEX IF NOT EXISTS INDEX_PARAMETER ON PARAMETERS (p_parameter)' );
                transaction.executeSql( 'CREATE TABLE IF NOT EXISTS SITES (id unique, value)' );
                transaction.executeSql( 'CREATE INDEX IF NOT EXISTS IDX_SITES ON SITES (id)' );
                transaction.executeSql( 'CREATE TABLE IF NOT EXISTS relationship (daddy, child)' );
                transaction.executeSql( 'CREATE INDEX IF NOT EXISTS INDEX_REL_DADDY ON relationship (daddy)' );
                transaction.executeSql( 'CREATE INDEX IF NOT EXISTS INDEX_REL_CHILD ON relationship (child)' );
            } );
        };

        SQLite.initialize();
        return SQLite;
    }
})();
