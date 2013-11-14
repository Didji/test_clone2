angular.module('smartgeomobile').controller('synchronizationMenuController', function ($scope, $rootScope,$http, $location, Smartgeo, $window, i18n ) {

    // TODO : a faire dans l'installation (pour des raisons obscures, je n'y suis pas arrivé)
    $rootScope.site.activities._byId = [];
    for (i = 0; i < $rootScope.site.activities.length; i++) {
        $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
    }

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    Smartgeo.get_('reports', function(reports){
        $scope.reports = reports || [];
        $scope.$apply() ;
        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
    });

    $rootScope.$on("DEVICE_IS_ONLINE", function(){
        $scope.syncAll();
    });

    $scope.syncAll = function(){
        if(!$scope.reports.length){
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", 0);
            return ;
        }
        $scope.sync(0, function(){
            $scope.syncAll();
        });
    };

    $scope.sync = function($index, callback){
        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.reports[$index])
            .success(function(){
                $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
                Smartgeo.set_('reports', $scope.reports, function(){
                    $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
                    (callback || function(){})();
                });
            }).error(function(error){
                if(error.error){
                    alertify.error(error.error.text);
                } else {
                    alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                }
            });
    };

    $scope.__delete = function($index){
        $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
        Smartgeo.set_('reports',$scope.reports, function(){
             $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
        });
    };
});
