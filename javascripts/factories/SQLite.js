
    var SQLite = {

        DATABASE_SIZE: 1024 * 1024 * 50,
        DATABASE_VERSION: '0.0.1-angular',

        databases : {},

        openDatabase: function(args) {
            if(!SQLite.databases[args.name]){
                SQLite.databases[args.name] = (window.sqlitePlugin || window).openDatabase(args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE);
            }

            return SQLite.databases[args.name];
        },

        parameters : function(){
            return SQLite.openDatabase({name:'parameters'});
        },

        get: function(parameter, callback){
            SQLite.parameters().transaction(function(transaction){
                transaction.executeSql('CREATE TABLE IF NOT EXISTS PARAMETERS (p_parameter unique, p_value)');
                transaction.executeSql('CREATE INDEX IF NOT EXISTS INDEX_PARAMETER ON PARAMETERS (p_parameter)');
                transaction.executeSql('SELECT p_value FROM PARAMETERS WHERE p_parameter = ? ', [parameter], function(transaction, results){
                    if(results.rows.length === 1) {
                        (callback || function(){})(JSON.parse(results.rows.item(0).p_value));
                    } else {
                        (callback || function(){})(undefined);
                    }
                }, function(transaction, SqlError){
                    console.log(SqlError);
                    (callback || function(){})(undefined);
                });
            });
        },

        set: function(parameter, value, callback){
            SQLite.parameters().transaction(function(transaction){
                transaction.executeSql('CREATE TABLE IF NOT EXISTS PARAMETERS (p_parameter unique, p_value)');
                transaction.executeSql('CREATE INDEX IF NOT EXISTS INDEX_PARAMETER ON PARAMETERS (p_parameter)');
                transaction.executeSql('INSERT OR REPLACE INTO PARAMETERS(p_parameter, p_value) VALUES (?, ?)', [parameter, JSON.stringify(value)], function(transaction, results){
                    (callback || function(){})();
                }, function(transaction, SqlError){
                    console.log(SqlError);
                    (callback || function(){})(undefined);
                });
            });
        },

        unset: function(parameter, callback){
            SQLite.parameters().transaction(function(transaction){
                transaction.executeSql('CREATE TABLE IF NOT EXISTS PARAMETERS (p_parameter unique, p_value)');
                transaction.executeSql('CREATE INDEX IF NOT EXISTS INDEX_PARAMETER ON PARAMETERS (p_parameter)');
                transaction.executeSql('DELETE FROM PARAMETERS WHERE p_parameter = ? ', [parameter], function(transaction, results){
                    (callback || function(){})();
                }, function(transaction, SqlError){
                    console.log(SqlError);
                    (callback || function(){})();
                });
            });
        }

    };

window.smartgeoPersistenceSQLite = SQLite ;

smartgeomobile.factory('SQLite', function(){
    'use strict' ;
    return SQLite;
});
