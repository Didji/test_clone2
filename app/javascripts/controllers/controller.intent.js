(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('IntentController', IntentController);

    IntentController.$inject = ["$routeParams", "$location", "Smartgeo", "Storage", "Site", "prefetchedlocalsites", "Asset"];

    /**
     * @class IntentController
     * @desc Controlleur du menu de gestion des intents
     */
    function IntentController($routeParams, $location, Smartgeo, Storage, Site, prefetchedlocalsites, Asset) {

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
                preprocessIntentTarget(function () {
                    Storage.set('intent', intent);
                    Smartgeo.tokenAuth(intent.token, redirect, redirect);
                });
            }
        }

        /**
         * @name redirect
         * @desc Fonction de redirection
         */
        function redirect() {
            var redirection;
            if(intent.controller === 'oauth'){
                redirection = 'sites/';
            } else {
                redirection = 'map/' + Site.current.id;
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
                return Site.current;
            }
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

        /**
         * @name preprocessIntentTarget
         * @desc Traduit la cible de l'intent
         */
        function preprocessIntentTarget(callback) {

            if (!intent.map_target) {
                return callback();
            }

            var match, assetid;

            if ((match = intent.map_target.match(/^(\d+);([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/))) { // "24081;45.803,4.773"
                assetid = match[1];
                intent.latlng = [match[2], match[3]];
            } else if ((match = intent.map_target.match(/^(\d+.?\d+),([-+]?\d+.?\d+)$/))) {     // "45.803,4.773"
                intent.map_center = intent.latlng = [match[1], match[2]];
            } else if ((match = intent.map_target.match(/^(\d+)$/))) {                          // "24081"
                assetid = match[1];
            }

            if (assetid) {
                Asset.findOne(+assetid, function (asset) {
                    if(!asset){
                        alertify.log("L'objet "+assetid+" n'existe pas. Veuillez mettre à jour vos données.");
                    } else {
                        intent.asset = new Asset(asset);
                        intent.map_center = intent.asset.getCenter();
                    }
                    callback();
                });
            } else {
                callback();
            }

        }

    }

})();
