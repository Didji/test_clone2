/**
 * Controlleur d'authentification
 */
angular.module('smartgeomobile').controller('authController', function ($scope, $rootScope, $http, $location, $window, Smartgeo, SQLite, i18n){


    var lastuser = Smartgeo.get('user') || {"username":"","password":"","rememberme":true};

    $scope.version      = Smartgeo._SMARTGEO_MOBILE_VERSION ;
    $scope.username     = lastuser.username;
    $scope.pwd          = lastuser.password;
    $scope.readyToLog   = false;
    $scope.firstAuth    = false;
    $scope.gimapUrl     = Smartgeo._OVERRIDE_GIMAP_URL || Smartgeo.get('url') ;
    $scope.smallUrl     = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');
    $scope.rememberme = lastuser.password.length ? true : false;
    $scope.$on("DEVICE_IS_ONLINE", ping);
    $scope.$on("DEVICE_IS_OFFLINE", ping);

    if($scope.gimapUrl){
        ping();
    } else {
        $scope.firstAuth  = true ;
        $scope.logMessage = '_AUTH_LOG_MESSAGE_INIT_';
    }


    /**
     * Vérifie que le serveur est accessible et déconnecte l'utilisateur courant.
     */
    function ping(callback) {
        $scope.readyToLog = false;
        $scope.logMessage = '_AUTH_LOG_MESSAGE_CHECK_';

        Smartgeo.ping(function(serverIsReachable){
            $scope.logMessage = '_AUTH_LOG_MESSAGE_' + (serverIsReachable ? 'REMOTE' : 'LOCAL') + '_' ;
            $scope.readyToLog = true;
            if(typeof callback === 'function'){
                (callback || function(){})(serverIsReachable);
            }
            // if(!$scope.$$phase) {
            //     $scope.$apply();
            // }
        });
    }

    function loginFailed(response, status) {
        /**
         * TODO: find a smart way to detect X-Orginin errors
         *       (they looks like no connection)
         */
        if(status === 403){
            alertify.alert("Mot de passe incorrect" + (response.login ? " pour l'utilisateur " + response.login : ""));
        } else if (status === ''){
            alertify.alert("L'application n'est pas parvenue à joindre le serveur.");
        } else {
            alertify.alert("Connexion au serveur impossible ("+status+")");
        }
        ping();
    }

    function remoteLogin() {

        $scope.readyToLog = false;
        $scope.logMessage = "Veuillez patienter...";

        Smartgeo.login(encodeURIComponent($scope.username), encodeURIComponent($scope.pwd),
            function(){
                var knownUsers = Smartgeo.get('knownUsers') || {} ;
                    knownUsers[$scope.username] = $scope.pwd;
                Smartgeo.set('knownUsers', knownUsers);
                // if(lastuser.password !== $scope.pwd) {
                    // var $scope.rememberme  = confirm("Souhaitez-vous que l'application retienne votre mot de passe ?");
                    lastuser = {
                        password:   $scope.rememberme ? $scope.pwd : '',
                        rememberme: $scope.rememberme
                    };
                // }
                lastuser.username = $scope.username;
                Smartgeo.set('user',lastuser);
                $location.path('sites');
            },loginFailed);
    }

    function localLogin() {
        var knownUsers = Smartgeo.get('knownUsers') || {} ;
        if(knownUsers[$scope.username] === $scope.pwd) {
            $location.path('sites');
        } else {
            alertify.alert(i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [$scope.username]));
        }
    }

    $scope.login = function(){

        if($scope.firstAuth){
            $scope.gimapUrl = Smartgeo.setGimapUrl($scope.gimapUrl);
            return ping(function(serverIsReachable){
                if(serverIsReachable){
                    $scope.firstAuth = false ;
                    $scope.login();
                } else {
                    alertify.alert("Le serveur n'est pas joignable.");
                }
            });
        }

        $scope.username = $scope.username.trim();
        $scope.pwd      = $scope.pwd.trim();

        if(!$scope.username.length || !$scope.pwd.length){
            alertify.alert("Veuillez renseigner un nom d'utilisateur et un mot de passe.");
            return false ;
        }
        Smartgeo.get('online') === true ? remoteLogin() : localLogin();
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
