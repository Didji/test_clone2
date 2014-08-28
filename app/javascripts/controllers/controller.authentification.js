(function(){

    'use strict';

    angular
        .module('smartgeomobile')
        .controller( 'AuthController', AuthController );

    AuthController.$inject = ["$rootScope", "$location", "Smartgeo", "i18n", "$route", "$http"];

    /**
     * @class AuthController
     * @desc Controlleur de la page d'authentification.
     *
     * @property {Object}   user            Utilisateur en cours d'authentification
     * @property {String}   gimapServer     Url du serveur GiMAP complète
     * @property {String}   errorMessage    Erreur en cours
     * @property {Boolean}  firstAuth       Est ce la première authentification ?
     * @property {Boolean}  loginInProgress Authentification en cours ?
     */

    function AuthController($rootScope, $location, Smartgeo, i18n, $route, $http) {

        var vm = this;

        vm.login = login ;
        vm.reset = reset ;

        vm.user             = {} ;
        vm.gimapServer      = "" ;
        vm.firstAuth        = false ;
        vm.errorMessage     = "" ;
        vm.loginInProgress  = false ;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            Smartgeo.initialize();

            $rootScope.currentPage  = "Authentification";
            vm.user             = (Smartgeo.get('users') || {})[Smartgeo.get('lastUser')] || {"rememberme": true};
            vm.gimapServer      = (Smartgeo.get('url')   || "");
            vm.firstAuth        = vm.gimapServer.length ? Smartgeo.ping() && false : true ;

        }

        /**
         * @name loginSuccess
         * @desc Callback de succès de l'authentification
         */
        function loginSuccess(data, status) {

            var localSites = [] , tmp = Smartgeo.get_('sites'), remoteSites = [] ;

            for(var site in tmp){
                localSites.push(tmp[site]);
            }

            for(var site in data.sites){
                if( !data.sites[site].isAdmin && !data.sites[site].isAdminCarto){
                    remoteSites.push(data.sites[site]);
                }
            }

            if(vm.user.rememberme){
                Smartgeo.set('lastUser', vm.user.username);
            } else if(Smartgeo.get('lastUser') === vm.user.username){
                Smartgeo.unset('lastUser');
            }
            var users = Smartgeo.get('users') || {};
            users[vm.user.username] = vm.user;
            Smartgeo.set('users', users);

            if(remoteSites.length){
                Smartgeo.set('availableRemoteSites', remoteSites.length);
                Smartgeo.set('online', true);
            } else {
                Smartgeo.set('online', false);
            }
            Smartgeo.set('availableLocalSites', localSites.length);

            if(remoteSites.length === 0 && localSites.length === 1 && localSites[0].installed === true) {
                // Offline avec un site installé
                $location.path('/map/' + localSites[0].id);
            } else if(remoteSites.length === 1 && localSites.length === 1 && localSites[0].installed === true && localSites[0].id === remoteSites[0].id) {
                // Online avec un site installé : Authentification nécessaire
                Smartgeo.selectSiteRemotely(localSites[0].id, function(){
                    $location.path('/map/' + localSites[0].id);
                },function(){
                    vm.errorMessage = (i18n.get('_AUTH_UNKNOWN_ERROR_OCCURED_'));
                });
            } else if(remoteSites.length === 1){
                // Online avec un site non installé : On l'installe directement
                $location.path('/sites/install/' + remoteSites[0].id);
            } else if((remoteSites.length + localSites.length) > 0) {
                $location.path('sites');
            } else {
                vm.errorMessage = (i18n.get('_AUTH_UNKNOWN_ERROR_OCCURED_'));
                console.error('remoteSites : ', remoteSites, 'localSites : ', localSites);
                vm.loginInProgress = false;
            }

        }

        /**
         * @name loginError
         * @desc Callback d'erreur de l'authentification
         */
        function loginError(response, status) {
            var sites = Object.keys(Smartgeo.get_('sites') || {}),
                users = Smartgeo.get('users') || {};

            if(status >= 400 && status < 500 || sites.length > 0 && users[vm.user.username].password !== vm.user.password){
                vm.errorMessage = (i18n.get("_AUTH_INCORRECT_PASSWORD"));
            } else if(vm.firstAuth){
                vm.errorMessage = (i18n.get("_AUTH_SERVER_UNREACHABLE"));
            } else if(sites.length === 0){
                vm.errorMessage = (i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [vm.user.username]));
            } else if(sites.length > 0 && users[vm.user.username].password === vm.user.password){
                return loginSuccess({sites:[]}, 0);
            }

            vm.loginInProgress = false;
        }

        /**
         * @name login
         * @desc Appelé à l'event 'submit' du formulaire
         */
        function login() {

            vm.loginInProgress = true;
            vm.errorMessage    =   "";
            vm.gimapServer     = vm.firstAuth ? Smartgeo.setGimapUrl(vm.gimapServer) : vm.gimapServer ;

            var url = Smartgeo.getServiceUrl('global.auth.json', {
                'login': encodeURIComponent(vm.user.username),
                'pwd': encodeURIComponent(vm.user.password),
                'forcegimaplogin': true
            });

            $http.post(url, {}, {timeout:Smartgeo._SERVER_UNREACHABLE_THRESHOLD })
                .success(loginSuccess)
                .error(loginError);

        }

        /**
         * @name reset
         * @desc Reset le formulaire, et Smartgeo Mobile
         */
        function reset() {
            Smartgeo.reset();
            $route.reload();
        }

    }

})();
