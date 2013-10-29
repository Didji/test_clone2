angular.module('smartgeomobile').factory('SQLite', function(){

    var SQLite = {

        DATABASE_SIZE: 1024 * 1024 * 50,
        DATABASE_VERSION: '0.0.1-angular',

        databases : {},

        openDatabase: function(args) {
            if(!SQLite.databases[args.name]){
                SQLite.databases[args.name] = window.openDatabase(args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE);
            }

            return SQLite.databases[args.name];
        }

    };
    return SQLite;

});
