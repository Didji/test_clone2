function authController($scope, $http, $location, Smartgeo, SQLite){
    var user = JSON.parse(localStorage.user || '{"firstLogin":true,"username":"","pwd":""}');
    $scope.username = user.username;
    $scope.pwd = user.pwd;
    

    $scope.login = function(){
        var url  = Smartgeo.get('url')+"global.auth.json";
            url += "&login="+encodeURIComponent($scope.username);
            url += "&pwd="+encodeURIComponent($scope.pwd);
        $http.get(url)
            .success(function(){
                if(user.firstLogin) {
                    var savePwd  = confirm("Souhaitez-vous que l'application retienne votre mot de passe ?");
                    localStorage.user = JSON.stringify({
                        username: $scope.username,
                        pwd: savePwd ? $scope.pwd : ''
                    });
                }
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
