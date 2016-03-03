( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'IntentController', IntentController );

    IntentController.$inject = ["$routeParams", "$location", "Storage", "Site", "prefetchedlocalsites", "Asset", "Authenticator", "Utils", "i18n", "LicenseManager"];

    /**
     * @class IntentController
     * @desc Controlleur du menu de gestion des intents
     */
    function IntentController($routeParams, $location, Storage, Site, prefetchedlocalsites, Asset, Authenticator, Utils, i18n, LicenseManager) {
        var intent = {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            intent = $routeParams;

            Storage.set( 'intent', intent );

            if (!intent.controller) {
                alertify.alert( "Intent non valide : veuillez spécifier une action." );
            } else if (!Site.current && !selectFirstSite() && intent.controller !== "oauth") {
                firstLaunch();
            } else {
                preprocessIntentTarget( function() {
                    Storage.set( 'intent', intent );
                    redirect();
                } );
            }
        }

        /**
         * @name redirect
         * @desc Fonction de redirection
         */
        function redirect() {
            if (!Site.current) {
                $location.path( 'sites/' );
            } else {
                $location.path( 'map/' + Site.current.id );
            }
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
            if ( LicenseManager.oauth ) {
                $location.url('/oauth');
                $rootScope.$apply();
            } else {
                alertify.log( "Vous devez d'abord vous connecter et faire une installation de patrimoine avant de pouvoir consulter celle-ci" );
            }
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

            if ( (match = intent.map_target.match( /^(\d+);([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/ )) ) {
                assetid = match[1];
                intent.latlng = intent.map_center = [match[2], match[3]];
            } else if ( (match = intent.map_target.match( /^(\d+.?\d+),([-+]?\d+.?\d+)$/ )) ) {
                intent.map_center = intent.latlng = [match[1], match[2]];
            } else if ( (match = intent.map_target.match( /^(\d+)$/ )) ) {
                assetid = match[1];
            }

            if (assetid) {
                Asset.findOne( +assetid, function(asset) {
                    if (!asset) {
                        alertify.log( "L'objet " + assetid + " n'existe pas. Veuillez mettre à jour vos données." );
                    } else {
                        intent.asset = new Asset( asset );
                        intent.map_center = intent.asset.getCenter();
                    }
                    callback();
                } );
            } else {
                callback();
            }

        }

    }

} )();
