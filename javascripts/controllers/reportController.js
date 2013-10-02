function reportController($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http){

    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;

    $scope.report = {
        assets: [],
        fields: {}
    };

    $scope.loadAssets = function(){
        Smartgeo.findAssetsByOkey($scope.site, $scope.report.activity.okeys[0], function(assets){
            $scope.assets = assets ;
            $scope.$apply();
        });
    };

    for (var i = 0; i < $scope.site.activities.length; i++) {
        if($scope.site.activities[i].id == $routeParams.activity) {
            $scope.report = {
                fields : {},
                activity : $scope.site.activities[i]
            };
            break;
        }
    }

    if($routeParams.assets){
        $scope.report.assets = $routeParams.assets.split(',');
    }

    if($scope.report && $scope.report.activity){
        $scope.loadAssets();
    }

    $scope.sendReport = function (event) {
        $scope.report.activity = $scope.report.activity.id ;
        console.log($scope.report);
        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.report)
            .success(function(){
                $location.path('map/'+$scope.site.id);
                console.log(arguments);
            })
            .error(function(){
                $location.path('map/'+$scope.site.id);
                console.log(arguments);
            });

        return false ;
    };
}
