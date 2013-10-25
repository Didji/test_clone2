angular.module('smartgeomobile').controller('menuController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite){

    $scope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $window.document.addEventListener('menubutton', function() {
        $scope.mlPushMenu._openMenu();
    }, false);

    $window.document.addEventListener('backbutton', function(e) {
        var self = $scope.mlPushMenu;

        self.level--;
        self.level === 0 ? self._resetMenu() : self._closeMenu();
        e.preventDefault();

        return false;
    }, false);

    $scope.close = function (event){
        if(event && event.preventDefault){
            event.preventDefault();
        }
        $scope.mlPushMenu._resetMenu();
        return false;
    };

    function updateSyncNumber() {
        $scope.toSyncNumber = (Smartgeo.get('reports') || []).length;
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    }
    updateSyncNumber();
    $scope.$on('REPORT_LOCAL_NUMBER_CHANGE', updateSyncNumber);

    $scope.activateConsultation = function(event){
        event.preventDefault();
        $rootScope.$broadcast("ACTIVATE_CONSULTATION");
        $scope.close();
        return false;
    };

    $scope.activatePosition = function(event){
        event.preventDefault();
        $rootScope.$broadcast("ACTIVATE_POSITION");
        $scope.close();
    };
});
