angular.module('smartgeomobile').factory('SQLite', function(){
    return {
        DATABASE_SIZE: 1024 * 1024 * 50,
        DATABASE_VERSION: '0.0.1-angular',
        databases : {},
        openDatabase: function(args) {

            if(!databases[args.name]){
                databases[args.name] = window.openDatabase(args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE);
            }

            return databases[args.name];

            // if(this._isRunningOnMobile()){
                // return window.sqlitePlugin.openDatabase(args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE);
            // } else {
                // return window.openDatabase(args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE);
            // }
        }
    };
});
