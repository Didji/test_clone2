function authController($scope, $http, $location, Smartgeo, SQLite){
    $scope.login = function(){
        var url  = Smartgeo.get('url')+"global.auth.json";
            url += "&login="+encodeURIComponent($scope.username);
            url += "&pwd="+encodeURIComponent($scope.pwd);
        $http.get(url)
            .success(function(){
                $location.path('sites');
            }).error(function(){
                window.alert('erreur');
            });
    };
    $scope.setGimapUrl = function(){
        $scope.gimapUrl = Smartgeo.setGimapUrl();
    };
    $scope.gimapUrl = Smartgeo.get('url') ;
}
