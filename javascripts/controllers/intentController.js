function intentController($scope, $routeParams, $location, $rootScope, Smartgeo, $http, $window){


    // #/intent/void/map
    // #/intent//map//
    // #/intent/?map_target=2479408&report_target=2479408&map_marker=true&report_activity=56550253&report_fields[###145656###]=250mm&report_mission=56555111NCA12&report_url_redirect=https://recette.m-ve.com/feuillederoute//map
    // #/intent/?map_target=48.15303870674,-1.6148&report_target=48.15303870674,-1.6148&map_marker=false&report_activity=56550253&report_mission=56555111NCA12&report_url_redirect=https://recette.m-ve.com/feuillederoute//map
    // #/intent/?map_target=48.15303870674,-1.6148&report_target=48.15303870674,-1.6148&report_activity=56550253&report_url_redirect=https://recette.m-ve.com/feuillederoute//map/sdfijksbgfdjhgdsfkjhsdfih
    // #/intent/?map_target=2479408&report_target=2479408&report_activity=56550253&report_fields[Code%20contrat]=541E41&report_fields[Diametre]=200&report_url_redirect=https://recette.m-ve.com/feuillederoute//map
    // #/intent/?report_activity=44407263&report_target=1323836/report
    // #/intent/?report_activity=44407263&report_target=1323836/report
    // #/intent/?report_activity=44407263&report_target=1323836&report_mission=13/report
    // #/intent/?report_activity=44407263&report_target=1323836,1323837,1323838&report_mission=13/report
    // #/intent/?report_activity=44407263&report_target=1323836,1323837,1323838&report_mission=13&report_url_redirect=http%3A%2F%2Fdomain.com%2F%3F%5BLABEL_INDEXED_FIELDS%5D/report
    // #/intent/?report_activity=44407263&report_target=1323836,1323837,1323838&report_mission=13&report_url_redirect=http%3A%2F%2Fdomain.com%2F%3F%5BKEY_INDEXED_FIELDS%5D/report
     
     
 


    // $http.get('http://canopee.m-ve.com/index.php?service=global.auth.json&token=ya29.AHES6ZSMM-11Vvbs6hOjAeHn5v-vTufIBrpimaMWwVB-mTkhzeahng')
    //     .success(function(){console.log(arguments)}).error(function(){console.log(arguments)});

    // return ;

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
