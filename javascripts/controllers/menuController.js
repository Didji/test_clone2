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

    function closest( e, classname ) {
        if( classie.has( e, classname ) ) {
            return e;
        }
        return e.parentNode && closest( e.parentNode, classname );
    }


    $scope.backToPreviousLevel = function(event){
        event.preventDefault();
        var level = closest( event.currentTarget, 'mp-level' ).getAttribute( 'data-level' );
        if( $scope.mlPushMenu.level <= level ) {
            event.stopPropagation();
            $scope.mlPushMenu.level = closest( event.currentTarget, 'mp-level' ).getAttribute( 'data-level' ) - 1;
            $scope.mlPushMenu.level === 0 ? $scope.mlPushMenu._resetMenu() : $scope.mlPushMenu._closeMenu();
        }
        return false;
    };

    $scope.close = function (event){
        if(event && event.preventDefault){
            event.preventDefault();
        }
        $scope.mlPushMenu._resetMenu();
        return false;
    };

    $scope.toggle = function(event){
        event.stopPropagation();
        event.preventDefault();
        $scope.mlPushMenu.menuState = $scope.mlPushMenu.menuState || 'closed';

        if($scope.mlPushMenu.menuState  === 'closed'){
            $scope.mlPushMenu._openMenu();
            $scope.mlPushMenu.menuState = 'opened';
        } else {
            $scope.mlPushMenu._resetMenu();
        }
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
        return false;
    };
});
