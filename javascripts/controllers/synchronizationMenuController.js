angular.module('smartgeomobile').controller('synchronizationMenuController', function ($scope, $rootScope,$http, $location, Smartgeo, $window, i18n ) {

    // TODO : a faire dans l'installation (pour des raisons obscures, je n'y suis pas arrivé)
    $rootScope.site.activities._byId = [];
    for (i = 0; i < $rootScope.site.activities.length; i++) {
        $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
    }

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});
    $scope.reports = Smartgeo.get('reports') || [] ;

    $rootScope.$on("DEVICE_IS_ONLINE", function(){
        $scope.syncAll();
    });

    $scope.syncAll = function(){
        //TODO: UGLY REFACTOR ALERT (doublon avec silentLogin)
        // Smartgeo.login_o(Smartgeo.get('user'), function(){
            for (var i = 0; i < $scope.reports.length; i++) {
                $scope.sync(i);
            }
        // }, function(error){
        //     alertify.error(error.error.text);
        // });
    };

    $scope.sync = function($index){
        //TODO: UGLY REFACTOR ALERT
        // Smartgeo.login_o(Smartgeo.get('user'), function(){
            $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.reports[$index])
                .success(function(){
                    $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
                    Smartgeo.set('reports', $scope.reports);
                    $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                }).error(function(error){
                    if(error.error){
                        alertify.error(error.error.text);
                    } else {
                        alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                    }
                });
        // }, function(error){
        //     alertify.error(error.error.text);
        // });
    };

    $scope.__delete = function($index){
        $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
        Smartgeo.set('reports',$scope.reports);
        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
    };
});
