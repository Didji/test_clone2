function reportController($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http){

    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;
    $scope.report = {
        assets: [],
        fields: {},
        activity: null
    };

    if($routeParams.assets){
        Smartgeo.findAssetsByGuids($scope.site, $routeParams.assets.split(','), function(assets){
            $scope.report.assets = assets ;
            $scope.$apply();
        });
    }

    $scope.loadAssets = function(){
        Smartgeo.findAssetsByOkey($scope.site, $scope.report.activity.okeys[0], function(assets){
            $scope.assets = assets ;
            $scope.$apply();
        });
    };

    if($routeParams.activity){
        for (var i = 0; i < $scope.site.activities.length; i++) {
            if($scope.site.activities[i].id == $routeParams.activity) {
                $scope.report.activity = $scope.site.activities[i];
                break;
            }
        }
        $scope.loadAssets();
    }

    $scope.sendReport = function (event) {
        for (var i = 0; i < $scope.report.assets.length; i++) {
            $scope.report.assets[i] = $scope.report.assets[i].id ;
        }

        // TODO: que faire si la liste des champs est vide ? ie $scope.report.field === {}
        $scope.report.activity = $scope.report.activity.id ;
        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.report)
            .success(function(){
                $location.path('map/'+$scope.site.id);
            })
            .error(function(){
                $location.path('map/'+$scope.site.id);
                console.log(arguments);
            });
    };
}
