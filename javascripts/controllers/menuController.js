function menuController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){
    new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $scope.toggleConsultation = function(event){
        event.preventDefault();
        $rootScope.$broadcast("TOGGLE_CONSULTATION");
    };
}
