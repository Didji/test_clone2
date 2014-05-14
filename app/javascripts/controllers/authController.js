/**
 * @class       authController
 * @classdesc   Controlleur de la page d'authentification.
 *
 * @property {String}   gimapServer Url du serveur GiMAP complète
 * @property {Boolean}  firstAuth   Est ce la première authentification ?
 */

angular.module('smartgeomobile').controller('authController', ["$scope", "$rootScope", "$location", "Smartgeo", "i18n", "$route", "$http", function($scope, $rootScope, $location, Smartgeo, i18n, $route, $http) {

    'use strict';

    /**
     * @method
     * @memberOf    authController
     * @desc        Fonction appelée à l'initialisation du DOM, arrête le polling, efface la persistence des menus,
     *              le site selectionné, clear les intervals
     */
    $scope.initialize = function() {

        Smartgeo.initialize();

        $scope.user         = (Smartgeo.get('users') || {})[Smartgeo.get('lastUser')] || {"rememberme": true};
        $scope.gimapServer  = (Smartgeo.get('url')   || "");
        $scope.firstAuth    = $scope.gimapServer.length ? Smartgeo.ping() && false : true ;

    };


    /**
     * @method
     * @memberOf    authController
     * @desc        Callback de succès de l'authentification
     */
    $scope.loginSuccess = function(data, status) {

        var localSites = [] , tmp = Smartgeo.get_('sites'), remoteSites = data.sites ;

        for(var site in tmp){
            localSites.push(tmp[site]);
        }

        if($scope.user.rememberme){
            Smartgeo.set('lastUser', $scope.user.username);
        } else if(Smartgeo.get('lastUser') === $scope.user.username){
            Smartgeo.unset('lastUser');
        }
        var users = Smartgeo.get('users') || {};
        users[$scope.user.username] = $scope.user;
        Smartgeo.set('users', users);

        if(remoteSites.length === 0 && localSites.length === 1 && localSites[0].installed === true) {
            // Offline avec un site installé
            $location.path('/map/' + localSites[0].id);
        } else if(remoteSites.length === 1 && localSites.length === 1 && localSites[0].installed === true && localSites[0].id === remoteSites[0].id) {
            // Online avec un site installé : Authentification nécessaire
            Smartgeo.selectSiteRemotely(localSites[0].id, function(){
                $location.path('/map/' + localSites[0].id);
            },function(){
                $scope.errorMessage = (i18n.get('_AUTH_UNKNOWN_ERROR_OCCURED_'));
            });
        } else if(remoteSites.length === 1){
            // Online avec un site non installé : On l'installe directement
            $location.path('/sites/install/' + remoteSites[0].id);
        } else if((remoteSites.length + localSites.length) > 0) {
            $location.path('sites');
        } else {
            $scope.errorMessage = (i18n.get('_AUTH_UNKNOWN_ERROR_OCCURED_'));
            console.error('remoteSites : ', remoteSites, 'localSites : ', localSites);
            $scope.loginInProgress = false;
        }

    };

    /**
     * @method
     * @memberOf    authController
     * @desc        Callback d'erreur de l'authentification
     */
    $scope.loginError = function(response, status) {
        var sites = Object.keys(Smartgeo.get_('sites') || {}),
            users = Smartgeo.get('users') || {};

        if(status >= 400 && status < 500 || sites.length > 0 && users[$scope.user.username].password !== $scope.user.password){
            $scope.errorMessage = (i18n.get("_AUTH_INCORRECT_PASSWORD"));
        } else if($scope.firstAuth){
            $scope.errorMessage = (i18n.get("_AUTH_SERVER_UNREACHABLE"));
        } else if(sites.length === 0){
            $scope.errorMessage = (i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [$scope.user.username]));
        } else if(sites.length > 0 && users[$scope.user.username].password === $scope.user.password){
            return $scope.loginSuccess({sites:[]}, 0);
        }

        $scope.loginInProgress = false;
    };



    /**
     * @method
     * @memberOf    authController
     * @desc        Methode appelé à l'event 'submit' du formulaire
     */
    $scope.login = function() {

        $scope.loginInProgress = true;
        $scope.errorMessage    =   "";
        $scope.gimapServer     = $scope.firstAuth ? Smartgeo.setGimapUrl($scope.gimapServer) : $scope.gimapServer ;

        var url = Smartgeo.getServiceUrl('global.auth.json', {
            'login': encodeURIComponent($scope.user.username),
            'pwd': encodeURIComponent($scope.user.password),
            'forcegimaplogin': true
        });

        $http.post(url, {}, {timeout:Smartgeo._SERVER_UNREACHABLE_THRESHOLD })
            .success($scope.loginSuccess)
            .error($scope.loginError);

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

}]).filter('urlShortener', function() {

    /**
     * @method
     * @memberOf    authController
     * @desc        Translate "http://smartgeo.fr/index.php?service=" to "smartgeo.fr"
     */
    function urlShortener(url) {
        return url.replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');
    }

    return urlShortener ;
});
