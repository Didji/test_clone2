angular.module('smartgeomobile').controller('synchronizationMenuController', function ($scope, $rootScope,$http, $location, Smartgeo, $window, i18n, $timeout ) {


    // TODO : a faire dans l'installation (pour des raisons obscures, je n'y suis pas arrivé)
    $rootScope.site.activities._byId = [];
    for (i = 0; i < $rootScope.site.activities.length; i++) {
        $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
    }

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    $timeout(function() {
        Smartgeo.get_('reports', function(reports){
            reports = reports || [] ;
            $scope.reports = [];
            for (var i = 0; i < reports.length; i++) {
                if(!reports[i].synced){
                    $scope.reports.push(reports[i]);
                }
            }
            Smartgeo.set_('reports', $scope.reports, function(){
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
            });
            $scope.$apply() ;
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
        });
    }, 500);

    $rootScope.$on("DEVICE_IS_ONLINE", function(){
        $scope.syncAll();
    });

    $scope.syncAll = function(){
        if(!$scope.reports.length){
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", 0);
            return ;
        } else {
            for (var i = 0; i < $scope.reports.length; i++) {
               $scope.sync(i);
            }
        }
    };

    $scope.sync = function($index, callback){
        if($scope.reports[$index].synced){
            return false;
        }
        $scope.reports[$index].syncInProgress = true ;
        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.reports[$index])
            .success(function(){
                $scope.reports[$index].syncInProgress = false ;
                $scope.reports[$index].synced = true ;
                $timeout(function(){
                    $scope.reports[$index].hide = true ;
                },3000);
                Smartgeo.set_('reports', $scope.reports, function(){
                    $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                });
            }).error(function(error){
                if(error.error){
                    alertify.error(error.error.text);
                } else {
                    alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                }
                $scope.reports[$index].syncInProgress = false ;
            });
    };

    $scope.__delete = function($index){
        $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
        Smartgeo.set_('reports',$scope.reports, function(){
             $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
        });
    };

    $scope.uninstallCurrentSite = function(){
        alertify.confirm(i18n.get('_SYNC_UNINSTALL_CONFIRM_MESSAGE_', site.label), function (e) {
            if (e) {
                $location.path('sites/uninstall/'+ site.id);
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    $scope.deleteWithUUID= function(uuid){
        for (var i = 0; i < $scope.reports.length; i++) {
            if($scope.reports[i].uuid === uuid){
                $scope.reports.splice(i, 1);
                console.log('spliced !');
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                break;
            }
        }
    };

});
