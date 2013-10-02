function menuController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){
    new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});
}
