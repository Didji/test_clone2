function menuController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){
    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;
    new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});
}
