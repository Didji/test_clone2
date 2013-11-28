angular.module('smartgeomobile').controller('intentController', function ($scope, $routeParams, $location, $rootScope, Smartgeo, $http, $window, G3ME, i18n){

    $scope.controller = $routeParams.controller ;

    if ($scope.controller === "oauth") {
        if (!Smartgeo.get("url") || Smartgeo.get("url").indexOf($routeParams.url) === -1) {
            Smartgeo.setGimapUrl($routeParams.url);
        }
        return tokenAuth($routeParams.token, function(){
            $location.path('sites/');
        });
    }

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
        alertify.alert(i18n.get("_INTENT_ZERO_SITE_SELECTED"));
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
                alertify.alert(i18n.get("_INTENT_OBJECT_NOT_FOUND"));
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
        }, function(){
            document.location.reload();
        });
    } else {
        tokenAuth($routeParams.token, redirect);
    }

    function tokenAuth(token, callback){

        var currentUser = Smartgeo.get('user') || {};
        currentUser.token = token ;
        Smartgeo.set('user',currentUser) ;

        Smartgeo.login(token, callback, function(response){
            if( (response && response.status === 200) || !response) {
                callback();
            } else {
                alertify.alert(i18n.get("_INTENT_AUTH_FAILED", status));
                $location.path('#');
            }
        });
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
        }
    }
});
