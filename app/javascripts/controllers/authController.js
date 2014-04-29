/**
 * @class       authController
 * @classdesc   Controlleur associé à la page d'authentification.
 *
 * @property {String}   user     Dernier utilisateur loggué
 * @property {String}   username     Modèle associé au champs "Utilisateur"
 * @property {String}   pwd          Modèle associé au champs "Mot de passe"
 * @property {Boolean}  rememberme   Modèle associé au champs "Se souvenir du mot de passe"
 * @property {Boolean}  readyToLog   Passe à 'true' lorsque le ping du serveur est terminé
 * @property {String}   gimapServer     Url du serveur GiMAP complète
 * @property {String}   smallUrl     Url du serveur GiMAP raccourcie
 * @property {Boolean}  firstAuth    Est ce la première authentification
 * @property {String}   logMessage   Message affiché sur le bouton d'authentification
 */

angular.module('smartgeomobile').controller('authController', function($scope, $rootScope, $location, Smartgeo, i18n, $route, $http) {

    'use strict';

    $scope.user = (Smartgeo.get('users') || {})[Smartgeo.get('lastUser')] || {
        "username": "",
        "password": "",
        "rememberme": true
    };

    $scope.gimapServer  = Smartgeo.get('url') || "";

    if($scope.gimapServer.length){
        $scope.firstAuth = false ;
        Smartgeo.ping();
    } else {
        $scope.firstAuth = true ;
    }

    /**
     * @method
     * @memberOf    authController
     * @desc        Fonction appelée à l'initialisation du DOM, arrête le polling, efface la persistence des menus,
     *              le site selectionné, clear les intervals
     */
    $scope.initialize = function() {

        $scope.$on('$locationChangeStart', $scope.preventLocationChangeStart);

        Smartgeo.clearSiteSelection();
        Smartgeo.clearPersistence();
        Smartgeo.clearIntervals();
        Smartgeo.clearPollingRequest();

    };

    /**
     * @method
     * @memberOf    authController
     * @desc        Permet de ne pas revenir à la carte après une déconnexion
     *
     * @param {Event}  event   Evenenement initial
     * @param {String} next    Route suivante
     * @param {String} current Route courante
     */
    $scope.preventLocationChangeStart = function(event, next, current) {
        if (next.indexOf('/map/') !== -1) {
            event.preventDefault();
        }
    }

    /**
     * @method
     * @memberOf    authController
     * @desc        Ping le serveur et appel $scope.pingCallback dès la réponse
     */
    // $scope.ping = function() {
    //     $scope.readyToLog = false;
    //     // $scope.logMessage = '_AUTH_LOG_MESSAGE_CHECK_';
    //     Smartgeo.ping($scope.pingCallback);
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Appelée par $scope.ping
     *
     * @param {Boolean} yes Le serveur distant est il joignable ?
     */
    // $scope.pingCallback = function(yes) {
    //     // $scope.logMessage = '_AUTH_LOG_MESSAGE_' + (yes ? 'REMOTE' : 'LOCAL') + '_';
    //     $scope.readyToLog = true;
    //     if (!yes) {
    //         alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
    //     }
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Vérifie les inputs (username/password) et choisi l'authentification en fonction de la connectivité
     *
     * @returns {Boolean} false en cas d'echec
     */
    // $scope.login_ = function() {
    //     $scope.username = $scope.username.trim();
    //     $scope.pwd = $scope.pwd.trim();
    //     if (!$scope.username.length || !$scope.pwd.length) {
    //         alertify.alert(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
    //         return false;
    //     }
    //     $scope[Smartgeo.get('online') === true ? "remoteLogin" : "localLogin"]();
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Authentification distante
     */
    // $scope.remoteLogin = function() {
    //     $scope.readyToLog = false;
    //     $scope.logMessage = "_AUTH_PLEASE_WAIT";
    //     Smartgeo.login(encodeURIComponent($scope.username), encodeURIComponent($scope.pwd), $scope.loginSucceed, $scope.loginFailed);
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Authentification locale
     */
    // $scope.localLogin = function() {
    //     var users = Smartgeo.get('users') || {};
    //     if (users[$scope.username] === $scope.pwd) {
    //         $scope.loginSucceed();
    //     } else {
    //         $scope.loginFailed(401);
    //     }
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Callback d'echec de l'authentification
     *
     * @param {String} response Réponse du serveur
     * @param {int} status   Status HTTP de la réponse du serveur
     */
    // $scope.loginFailed = function(response, status) {
    //     if (status === 403) {
    //         alertify.alert(i18n.get("_AUTH_INCORRECT_PASSWORD"));
    //     } else if (status === 401) {
    //         alertify.alert(i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [$scope.username]));
    //     } else if (!status) {
    //         alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
    //     } else {
    //         alertify.alert(i18n.get("_AUTH_SERVER_ERROR", status));
    //     }
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Callback de succès de l'authentification
     */
    // $scope.loginSucceed = function() {
    //     var users = Smartgeo.get('users') || {};
    //     users[$scope.username] = $scope.pwd;
    //     Smartgeo.set('users', users);
    //     $scope.user = {
    //         password: $scope.rememberme ? $scope.pwd : '',
    //         rememberme: $scope.rememberme
    //     };
    //     $scope.user.username = $scope.username;
    //     Smartgeo.set('user', $scope.user);
    //     $location.path('sites');
    // };

    /**
     * @method
     * @memberOf    authController
     * @desc        Methode appelé à l'event 'submit' du formulaire
     */
    $scope.login = function() {
        $scope.loginInProgress = true;

        if ($scope.firstAuth) {
            $scope.gimapServer = Smartgeo.setGimapUrl($scope.gimapServer);
        }

        var url = Smartgeo.getServiceUrl('global.auth.json', {
            'login': encodeURIComponent($scope.user.username),
            'pwd': encodeURIComponent($scope.user.password),
            'forcegimaplogin': true
        });

        $http.post(url, {}, {
            timeout: Smartgeo._SERVER_UNREACHABLE_THRESHOLD
        }).success(function () {

            if($scope.user.rememberme){
                Smartgeo.set('lastUser', $scope.user.username);
            } else if(Smartgeo.get('lastUser') === $scope.user.username){
                Smartgeo.unset('lastUser');
            }

            var users = Smartgeo.get('users') || {};
            users[$scope.user.username] = $scope.user;
            Smartgeo.set('users', users);

            $location.path('sites');

        }).error(function (response, status) {
            if(status >= 500){
                // ERREUR SERVEUR
            } else if(status >= 400){
                // ERREUR CLIENT (AUTHENTIFICATION)
            } else if((Object.keys(Smartgeo.get_('sites')||{})).length === 0){

                // ERREUR RESEAU
            }
            console.log();
            // 403
            // MAUVAISE ADDRESSE (si firstAuth)
            //( SERVEUR EN RADE || OFFLINE) (si !firstAuth)
                // AUTH LOCAL si sites.length > 0
                // ERREUR SINON
        });

    };

    /**
     * @method
     * @memberOf    authController
     * @desc
     */
    $scope.authentificate = function() {
        $scope.loginInProgress = true;
        if ($scope.firstAuth) {
            $scope.gimapServer = Smartgeo.setGimapUrl($scope.gimapServer);
        }



        // else {
        //     $scope.login();
        // }
    };

    /**
     * @method
     * @memberOf    authController
     * @desc        Vérifie l'URL, les credentials, appelle Smartgeo.setgimapServer puis Smartgeo.ping le serveur
     *
     * @returns {Boolean} false en cas d'echec
     */
    $scope.initializeGimap = function() {
        if (!$scope.gimapServer.length || !$scope.username.trim().length || !$scope.pwd.trim().length) {
            alertify.alert(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
            return false;
        }
        $scope.gimapServer = Smartgeo.setgimapServer($scope.gimapServer);
        Smartgeo.ping($scope.initializeGimapPingCallback);
    }

    /**
     * @method
     * @memberOf    authController
     * @desc        Callback du ping initializeGimap
     *
     * @param {Boolean} yes Le serveur distant est il joignable ?
     */
    $scope.initializeGimapPingCallback = function(yes) {
        if (yes) {
            $scope.login();
        } else {
            alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
        }
    };

    /**
     * @method
     * @memberOf    authController
     * @desc        Reset le formulaire, et Smartgeo Mobile
     */
    $scope.reset = function() {
        Smartgeo.reset();
        $route.reload();
    };

    /**
     * @method
     * @memberOf    authController
     * @desc        Supprime le mot de passe stocké dans le localStorage
     */
    $scope.forgetPassword = function() {
        $scope.username = $scope.pwd = '';
        Smartgeo.unset('user');
    };

}).filter('urlShortener', function() {
    return function(url) {
        // Translate "http://smartgeo.fr/index.php?service=" to "smartgeo.fr"
        return url.replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');
    };
})
