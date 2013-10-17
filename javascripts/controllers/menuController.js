function menuController($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){

    $scope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $window.document.addEventListener('menubutton', function() {
        $scope.mlPushMenu._openMenu();
    }, false);
    
    $scope.close = function (){
        $scope.mlPushMenu._resetMenu();
    };

    $scope.toggleConsultation = function(event){
        event.preventDefault();
        $rootScope.$broadcast("TOGGLE_CONSULTATION");
        $scope.close();
    };
}
