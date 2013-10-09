/**
 * Controlleur d'authentification
 */
function authController($scope, $http, $location, Smartgeo, SQLite){

    $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION ;

    var lastuser = JSON.parse(localStorage.user || '{"username":"","pwd":"","savePwd":true}');
    $scope.username = lastuser.username;
    $scope.pwd = lastuser.pwd;
    $scope.readyToLog = false;
    $scope.logMessage = "Vérification du serveur";
    /**
     * Vérifie que le serveur est accessible et déconnecte l'utilisateur courant.
     */
    $scope.ping = function() {
        $scope.readyToLog = false;
        $scope.logMessage = "Vérification du serveur";

        var url  = Smartgeo.get('url')+"global.dcnx.json";
        $http.post(url)
            .success(function(data){
                $scope.readyToLog = true;
                $scope.logMessage = "Connexion distante";
                Smartgeo.set('online', true);
            }).error(function(){
                $scope.readyToLog = true;
                $scope.logMessage = "Connexion locale";
                Smartgeo.set('online', false);
            });
    };
    $scope.ping();

    function loginFailed() {
        $scope.ping();
        window.alert('Identifiants incorrects');
    }
    function remoteLogin() {
        var url  = Smartgeo.get('url')+"global.auth.json";
            url += "&login="+encodeURIComponent($scope.username);
            url += "&pwd="+encodeURIComponent($scope.pwd);
        $scope.readyToLog = false;
        $scope.logMessage = "Veuillez patienter...";
        $http.post(url)
            .success(function(){
                var knownUsers = JSON.parse(localStorage.knownUsers || '{}');
                knownUsers[$scope.username] = $scope.pwd;
                localStorage.knownUsers = JSON.stringify(knownUsers);

                if(lastuser.pwd !== $scope.pwd) {
                    var savePwd  = confirm("Souhaitez-vous que l'application retienne votre mot de passe ?");
                    lastuser = {
                        pwd: savePwd ? $scope.pwd : '',
                        savePwd: savePwd
                    };
                }
                lastuser.username = $scope.username;
                localStorage.user = JSON.stringify(lastuser);
                $location.path('sites');
            }).error(loginFailed);
    }
    function localLogin() {
        var knownUsers = JSON.parse(localStorage.knownUsers || '{}');
        if(knownUsers[$scope.username] === $scope.pwd) {
            $location.path('sites');
        } else {
            loginFailed();
        }
    }


    $scope.login = function(){
        Smartgeo.get('online') === 'true' ? remoteLogin() : localLogin();
    };
    $scope.setGimapUrl = function(){

        if(Smartgeo.setGimapUrl() === null){
            // L'utilisateur a annulé
            return ;
        }
        $scope.username = '';
        $scope.pwd = '';
        $scope.gimapUrl = Smartgeo.get('url') ;
        $scope.ping();
        $scope.smallUrl = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');

        localStorage.sites = '{}';
        localStorage.knownUsers = '{}';
    };
    $scope.parametersVisible = false;

    $scope.showParameters = function() {
        $scope.parametersVisible = true;
    };
    $scope.hideParameters = function() {
        $scope.parametersVisible = false;
    };
    $scope.forgetPassword = function() {
        $scope.username = $scope.pwd = '';
        localStorage.user = '{"username":"","pwd":"","savePwd":true}';
    };

    $scope.gimapUrl = Smartgeo.get('url') ;
    $scope.smallUrl = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');
}
