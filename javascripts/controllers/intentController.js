function intentController($scope, $routeParams, $location, $rootScope, Smartgeo, $http){


    $http.get('http://canopee.m-ve.com/index.php?service=global.auth.json&token=ya29.AHES6ZSMM-11Vvbs6hOjAeHn5v-vTufIBrpimaMWwVB-mTkhzeahng')
        .success(function(){console.log(arguments)}).error(function(){console.log(arguments)});

    return ;

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
        return false ;
    }

    var tmp = $routeParams.args.split('&'), arg ;

    for (var i = 0; i < tmp.length; i++) {
        arg = tmp[i].split('=');
        $rootScope[arg[0]] = arg[1];
    }

    tokenAuth($routeParams.token, redirect);

    function tokenAuth(token, callback){

        var url = Smartgeo.getServiceUrl('global.auth.json', {
            token:token
        });

        $http.get(url).success(callback).error(function(response, status){
            if(status === 403){
                $window.alert("Le token fournit n'est pas valide");
            } else if(status === 0){
                $window.alert("L'application n'est pas connectée et ne peut pas vérifier le token. \
                               Il sera vérifié à la prochaine connexion");
                callback();
            } else {
                $window.alert("L'authentification a échoué ("+status+")");
            }
        });

    }

    function redirect(){
        switch($routeParams.controller){
            case 'map':
                console.log('map/'+$rootScope.site.id);
                $location.path('map/'+$rootScope.site.id);
                break;

            case 'report':
                console.log('report/'+$rootScope.site.id);
                $location.path('report/'+$rootScope.site.id);
                break;

            default:
                $window.alert("Controller introuvable ("+$routeParams.controller+")");
                break;
        }
    }
}
