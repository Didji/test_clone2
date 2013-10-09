angular.module('smartgeomobile').factory('SQLite', function(){
    return {
        DATABASE_SIZE: 1024 * 1024 * 50,
        DATABASE_VERSION: '0.0.1-angular',
        openDatabase: function(args) {
            // TODO : MAKE IT POLYFILL (with cordova)
            return window.openDatabase(args.name, this.DATABASE_VERSION, args.name, this.DATABASE_SIZE);
        }
    };
});
