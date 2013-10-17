function synchronizationMenuController($scope, $rootScope,$http, $location, Smartgeo, $window) {

    // TODO : a faire dans l'installation (pour des raisons obscures, je n'y suis pas arrivé)
    $rootScope.site.activities._byId = [];
    for (i = 0; i < $rootScope.site.activities.length; i++) {
        $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
    }

    $scope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});
    $scope.reports = Smartgeo.get('reports') || [] ;

    $scope.syncAll = function(){
        for (var i = 0; i < $scope.reports.length; i++) {
            $scope.sync(i);
        }
    };

    $scope.sync = function($index){
        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.reports[$index])
            .success(function(){
                $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
                Smartgeo.set('reports', $scope.reports);
                $window.alert('CR Synchronisé');
            }).error(function(error){
                $window.alert('CR Non synchronisé : ' + error.error.text);
            });
    };

    $scope.delete = function($index){
        $scope.reports = $scope.reports.slice(0,$index).concat($scope.reports.slice($index+1,$scope.reports.length));
        Smartgeo.set('reports',$scope.reports);
    };
}
