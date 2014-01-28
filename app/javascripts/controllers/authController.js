/**
 * Controlleur d'authentification
 */
angular.module('smartgeomobile').controller('authController', function ($scope, $rootScope, $http, $location, $window, Smartgeo, SQLite, i18n){

    'use strict' ;

    $scope.initialize = function(){
        $scope.lastuser = Smartgeo.get('user') || {"username":"","password":"","rememberme":true};
        $scope.version      = Smartgeo._SMARTGEO_MOBILE_VERSION ;
        $scope.username     = $scope.lastuser.username;
        $scope.pwd          = $scope.lastuser.password;
        $scope.readyToLog   = false;
        $scope.firstAuth    = false;
        $scope.gimapUrl     = Smartgeo._OVERRIDE_GIMAP_URL || Smartgeo.get('url') ;
        $scope.smallUrl     = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');
        $scope.rememberme = $scope.lastuser.password &&  $scope.lastuser.password.length ? true : false;
        $scope.$on("DEVICE_IS_ONLINE", $scope.ping);
        $scope.$on("DEVICE_IS_OFFLINE", $scope.ping);
        $rootScope.site = null ;
        Smartgeo.clearPersistence();
        Smartgeo.clearIntervals();
        $rootScope.STOP_POLLING = true ;
        if(window.SmartgeoChromium){

            if(!window.ChromiumCallbacks){
                window.ChromiumCallbacks = [] ;
            }

            window.ChromiumCallbacks[13] = function(path){
                Smartgeo.set('tileRootPath', path);
            };
            SmartgeoChromium.getExtApplicationDirectory();
        }

        if($scope.gimapUrl){
            $scope.ping();
        } else {
            $scope.firstAuth  = true ;
            $scope.logMessage = '_AUTH_LOG_MESSAGE_INIT_';
        }

        // Prevent just unlogged user to go back to the map
        $scope.$on('$locationChangeStart', function (event, next, current) {
            if(next.indexOf('/map/') !== -1) {
                event.preventDefault();
            }
        });
    };

    /**
     * Vérifie que le serveur est accessible et déconnecte l'utilisateur courant.
     */
    $scope.ping = function (callback) {
        $scope.readyToLog = false;
        $scope.logMessage = '_AUTH_LOG_MESSAGE_CHECK_';
        Smartgeo.ping(function(serverIsReachable){
            $scope.logMessage = '_AUTH_LOG_MESSAGE_' + (serverIsReachable ? 'REMOTE' : 'LOCAL') + '_' ;
            $scope.readyToLog = true;
            if(typeof callback === 'function'){
                (callback || function(){})(serverIsReachable);
            }
        });
    };

    function loginFailed(response, status) {
        /**
         * TODO: find a smart way to detect X-Orginin errors
         *       (they looks like no connection)
         */
        if(status === 403){
            alertify.alert( i18n.get("_AUTH_INCORRECT_PASSWORD") );
        } else if (!status){
            alertify.alert( i18n.get("_AUTH_SERVER_UNREACHABLE") );
        } else {
            alertify.alert( i18n.get("_AUTH_SERVER_ERROR", status) );
        }
        $scope.ping();
    }

    $scope.remoteLogin = function() {

        $scope.readyToLog = false;
        $scope.logMessage = "_AUTH_PLEASE_WAIT";
        Smartgeo.login(encodeURIComponent($scope.username), encodeURIComponent($scope.pwd),
            function(){
                var knownUsers = Smartgeo.get('knownUsers') || {} ;
                    knownUsers[$scope.username] = $scope.pwd;
                Smartgeo.set('knownUsers', knownUsers);
                $scope.lastuser = {
                    password:   $scope.rememberme ? $scope.pwd : '',
                    rememberme: $scope.rememberme
                };
                $scope.lastuser.username = $scope.username;
                Smartgeo.set('user',$scope.lastuser);
                $location.path('sites');
            },loginFailed);
    };

    $scope.localLogin = function() {
        var knownUsers = Smartgeo.get('knownUsers') || {} ;
        if(knownUsers[$scope.username] === $scope.pwd) {
            $location.path('sites');
        } else {
            alertify.alert(i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [$scope.username]));
        }
    };

    $scope.login = function(){

        if($scope.firstAuth){
            $scope.gimapUrl = Smartgeo.setGimapUrl($scope.gimapUrl);
            return $scope.ping(function(serverIsReachable){
                if(serverIsReachable){
                    $scope.firstAuth = false ;
                    $scope.login();
                } else {
                    alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
                }
            });
        }

        $scope.username = $scope.username.trim();
        $scope.pwd      = $scope.pwd.trim();

        if(!$scope.username.length || !$scope.pwd.length){
            alertify.alert(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
            return false ;
        }
        $scope[Smartgeo.get('online') === true ? "remoteLogin" : "localLogin"]();
    };

    $scope.setGimapUrl = function(){
        $scope.firstAuth = true ;
        $scope.gimapUrl  = null ;
        $scope.username = '';
        $scope.pwd      = '';
        $scope.logMessage = '_AUTH_LOG_MESSAGE_INIT_';
    };

    $scope.forgetPassword = function() {
        $scope.username = $scope.pwd = '';
        Smartgeo.unset('user');
    };

});
