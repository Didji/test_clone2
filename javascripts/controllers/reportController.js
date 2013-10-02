function reportController($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http){

    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;
    $scope.report = {
        assets: [],
        fields: {},
        activity: null
    };

    $routeParams.assets =  ($routeParams.assets && $routeParams.assets.split(',')) || []  ;

    // Formatage des id de l'url en objet { 'id ' : int } pour pouvoir binder au ng-options du select
    // et setter des valeurs par defaut
    // TODO: récupérer les objets entier en base, car on a besoin des attributs pour renseigner les valeurs par defauts
    for (var i = 0; i < $routeParams.assets.length; i++) {
         $scope.report.assets.push( { id: $routeParams.assets[i]*1 });
    };

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
