angular.module('smartgeomobile').controller('menuController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n){

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

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
    $scope.open = function (event){
        if(event && event.preventDefault){
            event.preventDefault();
        }

        if(Smartgeo.isRunningOnLittleScreen()) {
            $rootScope.$broadcast("CONSULTATION_CLOSE_PANEL");
        }

        $scope.mlPushMenu._openMenu();
        $scope.mlPushMenu.menuState = 'opened';
        return false;
    };

    $scope.toggle = function(event){
        if(event && event.preventDefault){
            event.preventDefault();
        }
        $scope[$scope.mlPushMenu.menuState === 'opened' ? 'close' : 'open']();
    };

    function updateSyncNumber(event, number) {
        if(number !== undefined && number !== null){
            $scope.toSyncNumber = number ;
            if(!$scope.$$phase) {
                $scope.$apply();
            }
        } else {
            Smartgeo.get_('reports', function(reports){
                $scope.toSyncNumber = (reports||[]).length ;
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
    }
    $scope.$on('REPORT_LOCAL_NUMBER_CHANGE',
        function(){
            setTimeout(updateSyncNumber, 1000);
        });
    $scope.$on('_MENU_CLOSE_', $scope.close);

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
