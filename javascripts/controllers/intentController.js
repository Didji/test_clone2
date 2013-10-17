function intentController($scope, $routeParams, $location, $rootScope, Smartgeo, $http, $window, G3ME){

    $scope.controller = $routeParams.controller ;

    if(!$scope.controller){
        return false ;
    }

    if($rootScope.site){

    } else if($routeParams.site){
        $rootScope.site = $rootScope.site || Smartgeo.get('sites')[$routeParams.site] ;
    } else {
        var sites = Smartgeo.get('sites') ;
        for(var siteId in sites){
            if(sites.hasOwnProperty(siteId)){
                $rootScope.site = sites[siteId];
                break;
            }
        }
    }

    if(!$rootScope.site){
        $window.alert("Aucun site n'est disponible.");
        $location.path("#");
        return false ;
    }

    for(var arg in $routeParams){
        if($routeParams.hasOwnProperty(arg) && arg !== "controller" && arg !== "token"){
            $rootScope[arg] = $routeParams[arg];
        }
    }

    if($rootScope.map_target){
        // TODO: OULALA IT'S UGLY /!\ REFACTOR ALERT /!\
        G3ME.parseTarget($rootScope.site, $rootScope.map_target, function(assets){
            if(!assets.length){
                $window.alert("L'objet n'a pas été trouvé dans la base de données du terminal.")
                return tokenAuth($routeParams.token, redirect);
            }
            $rootScope.map_target = assets ;
            if( $rootScope.map_marker === 'true' || $rootScope.map_marker === true){
                $rootScope.map_marker = L.marker($rootScope.map_target);
                if($rootScope.report_target && $rootScope.report_activity){
                    $rootScope.map_marker.on('click',function(){
                        $location.path('/report/'+$rootScope.site.id+"/"+$rootScope.report_activity+"/"+$rootScope.report_target);
                        $scope.$apply();
                        if(!$scope.$$phase) {
                            $scope.$apply();
                        }
                    });
                }
            } else {
                $rootScope.map_marker = undefined;
            }
            tokenAuth($routeParams.token, redirect);
        });
    } else {
        tokenAuth($routeParams.token, redirect);
    }

    function tokenAuth(token, callback){

        var url = Smartgeo.getServiceUrl('global.auth.json', {
            token:token
        });
        return callback();
        // $http.get(url).then(function(response){
        //     if(response.status === 403 || response.data.auth === false){
        //         $window.alert("Le token fournit n'est pas valide");
        //         $location.path('#');
        //     } else if(response.status === 0){
        //         $window.alert("L'application n'est pas connectée et ne peut pas vérifier le token. Il sera vérifié à la prochaine connexion");
        //         callback();
        //     } else if(response.status === 200) {
        //         callback();
        //     } else {
        //         $window.alert("L'authentification a échoué ("+status+")");
        //         $location.path('#');
        //     }
        // });

    }

    function redirect(){
        switch($scope.controller){
            case 'map':
                $location.path('map/'+$rootScope.site.id);
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
                break;

            case 'report':
                $location.path('report/'+$rootScope.site.id+'/'+$rootScope.report_activity+'/'+$rootScope.target+'/');
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
                break;

            default:
                $window.alert("Controller introuvable ("+$routeParams.controller+")");
                break;
        }
    }
}
