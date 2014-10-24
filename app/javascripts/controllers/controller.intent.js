(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('IntentController', IntentController);

    IntentController.$inject = ["$routeParams", "$location", "Smartgeo", "Storage", "Site", "prefetchedlocalsites"];

    /**
     * @class IntentController
     * @desc Controlleur du menu de gestion des intents
     */
    function IntentController($routeParams, $location, Smartgeo, Storage, Site, prefetchedlocalsites) {

        var intent = {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            intent = Storage.set('intent', $routeParams);
            if (!intent.controller) {
                alertify.alert("Intent non valide : veuillez spécifier une action.");
            } else if (intent.controller === "oauth" || (!Site.current && !selectFirstSite() && intent.controller !== "oauth")) {
                firstLaunch();
            } else {
                Smartgeo.tokenAuth(intent.token, redirect, redirect);
            }
        }

        /**
         * @name redirect
         * @desc Fonction de redirection
         */
        function redirect() {
            var redirection;
            switch (intent.controller) {
            case 'map':
                redirection = intent.controller + '/' + Site.current.id;
                break;
            case 'report':
                redirection = intent.controller + '/' + Site.current.id + '/' + intent.report_activity + '/' + intent.target + '/';
                break;
            case 'oauth':
                redirection = 'sites/';
                break;
            }
            $location.path(redirection);
        }

        /**
         * @name selectFirstSite
         * @desc Fonction de selection de site. Dans le cas d'un intent, on choisi le premier site de la liste.
         */
        function selectFirstSite() {
            for (var siteid in prefetchedlocalsites) {
                Site.current = prefetchedlocalsites[siteid];
                break;
            }
            return Site.current;
        }

        /**
         * @name firstLaunch
         * @desc Fonction appelé à la première utilisation. Elle enregistre l'url du serveur et lance d'installation d'un site.
         */
        function firstLaunch() {
            if (!Storage.get("url") || Storage.get("url").indexOf(intent.url) === -1) {
                Smartgeo.setGimapUrl(intent.url);
            }
            Smartgeo.tokenAuth(intent.token, redirect, redirect);
        }

    }

})();
