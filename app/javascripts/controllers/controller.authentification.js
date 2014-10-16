(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('AuthController', AuthController);

    AuthController.$inject = ["$rootScope", "$location", "Smartgeo", "Storage", "i18n", "$route", "$http", "Site", "prefetchedlocalsites"];

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

    function AuthController($rootScope, $location, Smartgeo, Storage, i18n, $route, $http, Site, prefetchedlocalsites) {

        var vm = this;

        vm.login = login;
        vm.reset = reset;

        vm.user = {};
        vm.gimapServer = "";
        vm.firstAuth = false;
        vm.errorMessage = "";
        vm.loginInProgress = false;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            Smartgeo.initialize();
            Storage.remove('lastLeafletMapExtent');

            $rootScope.currentPage = "Authentification";

            vm.user = (Storage.get('users') || {})[Storage.get('lastUser')] || {
                "rememberme": true
            };
            vm.gimapServer = (Storage.get('url') || "");
            vm.firstAuth = vm.gimapServer.length ? Smartgeo.ping() && false : true;

        }

        /**
         * @name loginSuccess
         * @desc Callback de succès de l'authentification
         */
        function loginSuccess(data) {

            var localSites = [],
                tmp = prefetchedlocalsites,
                remoteSites = [];

            for (var site in tmp) {
                localSites.push(tmp[site]);
            }

            for (site in data.sites) {
                if (!data.sites[site].isAdmin && !data.sites[site].isAdminCarto) {
                    remoteSites.push(data.sites[site]);
                }
            }

            if (vm.user.rememberme) {
                Storage.set('lastUser', vm.user.username);
            } else if (Storage.get('lastUser') === vm.user.username) {
                Storage.remove('lastUser');
            }
            var users = Storage.get('users') || {};
            users[vm.user.username] = vm.user;
            Storage.set('users', users);

            if (remoteSites.length) {
                Storage.set('availableRemoteSites', remoteSites.length);
                Storage.set('online', true);
            } else {
                Storage.set('online', false);
            }
            Storage.set('availableLocalSites', localSites.length);

            if (remoteSites.length === 0 && localSites.length === 1 && localSites[0].installed === true) {
                // Offline avec un site installé
                $location.path('/map/' + localSites[0].id);
            } else if (remoteSites.length === 1 && localSites.length === 1 && localSites[0].installed === true && localSites[0].id === remoteSites[0].id) {
                // Online avec un site installé : Authentification nécessaire
                Smartgeo.selectSiteRemotely(localSites[0].id, function () {
                    $location.path('/map/' + localSites[0].id);
                }, function () {
                    vm.errorMessage = (i18n.get('_AUTH_UNKNOWN_ERROR_OCCURED_'));
                });
            } else if (remoteSites.length === 1 && localSites.length <= 1) {
                // Online avec un site non installé : On l'installe directement
                $location.path('/sites/install/' + remoteSites[0].id);
            } else if ((remoteSites.length + localSites.length) > 0) {
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
            var sites = Object.keys(prefetchedlocalsites || {}),
                users = Storage.get('users') || {};

            if (status >= 400 && status < 500 || sites.length > 0 && users[vm.user.username].password !== vm.user.password) {
                vm.errorMessage = (i18n.get("_AUTH_INCORRECT_PASSWORD"));
            } else if (vm.firstAuth) {
                vm.errorMessage = (i18n.get("_AUTH_SERVER_UNREACHABLE"));
            } else if (sites.length === 0) {
                vm.errorMessage = (i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [vm.user.username]));
            } else if (sites.length > 0 && users[vm.user.username].password === vm.user.password) {
                return loginSuccess({
                    sites: []
                }, 0);
            }

            vm.loginInProgress = false;
        }

        /**
         * @name login
         * @desc Appelé à l'event 'submit' du formulaire
         */
        function login() {

            vm.loginInProgress = true;
            vm.errorMessage = "";
            vm.gimapServer = vm.firstAuth ? Storage.setGimapUrl(vm.gimapServer) : vm.gimapServer;

            var url = Smartgeo.getServiceUrl('global.auth.json', {
                'login': encodeURIComponent(vm.user.username),
                'pwd': encodeURIComponent(vm.user.password),
                'forcegimaplogin': true
            });

            $http.post(url, {}, {
                    timeout: Smartgeo._SERVER_UNREACHABLE_THRESHOLD
                })
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
