angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){
    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});
});
