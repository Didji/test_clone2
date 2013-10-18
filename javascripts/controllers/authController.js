/**
 * Controlleur d'authentification
 */
function authController($scope, $rootScope, $http, $location, $window, Smartgeo, SQLite){


    var lastuser = Smartgeo.get('user') || {"username":"","password":"","rememberme":true};

    $scope.version      = Smartgeo._SMARTGEO_MOBILE_VERSION ;
    $scope.username     = lastuser.username;
    $scope.pwd          = lastuser.password;
    $scope.readyToLog   = false;
    $scope.logMessage   = "Vérification du serveur";
    $scope.gimapUrl     = Smartgeo.get('url') ;
    $scope.smallUrl     = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');

    $scope.$on("DEVICE_IS_ONLINE", ping);
    $scope.$on("DEVICE_IS_OFFLINE", ping);

    ping();

    /**
     * Vérifie que le serveur est accessible et déconnecte l'utilisateur courant.
     */
    function ping() {
        $scope.readyToLog = false;
        $scope.logMessage = "Vérification du serveur";

        Smartgeo.ping(function(serverIsReachable){
            $scope.logMessage = "Connexion " + (serverIsReachable ? 'distante' : 'locale');
            $scope.readyToLog = true;
        });
    };


    function loginFailed(response, status) {
        /**
         * TODO: find a smart way to detect X-Orginin errors
         *       (they looks like no connection)
         */
        if(status === 403){
            $window.alert("Mot de passe incorrecte pour l'utilisateur "+response.login);
        } else if (status === ''){
            $window.alert("L'application n'est pas parvenue à joindre le serveur.");
        } else {
            $window.alert("Connexion au serveur impossible ("+status+")");
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
                if(lastuser.password !== $scope.pwd) {
                    var rememberme  = confirm("Souhaitez-vous que l'application retienne votre mot de passe ?");
                    lastuser = {
                        password:   rememberme ? $scope.pwd : '',
                        rememberme: rememberme
                    };
                }
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
            $window.alert("Le mode déconnecté n'est pas disponible pour cet utilisateur car il ne s'est jamais authentifié en mode connecté.");
        }
    }

    $scope.login = function(){

        $scope.username = $scope.username.trim()
        $scope.pwd      = $scope.pwd.trim()

        if(!$scope.username.length || !$scope.pwd.length){
            $window.alert("Veuillez renseigner un nom d'utilisateur et un mot de passe.");
            return false ;
        }
        Smartgeo.get('online') === true ? remoteLogin() : localLogin();
    };

    $scope.setGimapUrl = function(){

        if(Smartgeo.setGimapUrl() === null){
            // L'utilisateur a annulé
            return ;
        }
        $scope.username = '';
        $scope.pwd      = '';
        $scope.gimapUrl = Smartgeo.get('url') ;
        $scope.smallUrl = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');

        ping();

        Smartgeo.unset('sites');
        Smartgeo.unset('knownUsers');

    };

    $scope.forgetPassword = function() {
        $scope.username = $scope.pwd = '';
        Smartgeo.unset('user');
    };

}
