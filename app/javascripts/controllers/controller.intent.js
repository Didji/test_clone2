( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'IntentController', IntentController );

    IntentController.$inject = ["$routeParams", "$location", "Storage", "Site", "prefetchedlocalsites", "Asset", "Authenticator", "Utils", "i18n"];

    /**
     * @class IntentController
     * @desc Controlleur du menu de gestion des intents
     */
    function IntentController($routeParams, $location, Storage, Site, prefetchedlocalsites, Asset, Authenticator, Utils, i18n) {
        var intent = {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            intent = $routeParams;
            //correction bug angular : si l'intent est "intent/oauth?..."" le controller vaut 'oaut' sans le 'h'...
            if (intent.controller === 'oaut') {
                intent.controller = 'oauth';
            }
            Storage.set( 'intent', intent );

            if (!intent.controller) {
                alertify.alert( "Intent non valide : veuillez spécifier une action." );
            } else if (intent.controller === "oauth" || (!Site.current && !selectFirstSite() && intent.controller !== "oauth")) {
                firstLaunch();
            } else {
                preprocessIntentTarget( function() {
                    Storage.set( 'intent', intent );
                    Authenticator.tokenAuth( intent.token, redirect, redirect );
                } );
            }
        }

        /**
         * @name redirect
         * @desc Fonction de redirection
         */
        function redirect(data) {
            if (intent.controller === 'oauth') {
                var localSites = [],
                    tmp = prefetchedlocalsites,
                    remoteSites = [];

                for (var site in tmp) {
                    localSites.push( tmp[site] );
                }

                if (data && data.sites) {
                    for (var site in data.sites) {
                        if (!data.sites[site].isAdmin && !data.sites[site].isAdminCarto) {
                            remoteSites.push( data.sites[site] );
                        }
                    }
                }

                if (remoteSites.length) {
                    Storage.set( 'availableRemoteSites', remoteSites.length );
                    Storage.set( 'online', true );
                } else {
                    Storage.set( 'online', false );
                }
                Storage.set( 'availableLocalSites', localSites.length );

                if (remoteSites.length === 0 && localSites.length === 1 && !!localSites[0].installed) {
                    // Offline avec un site installé
                    $location.path( '/map/' + localSites[0].id );
                } else if (remoteSites.length === 1 && localSites.length === 1 && !!localSites[0].installed && localSites[0].id === remoteSites[0].id) {
                    // Online avec un site installé : Authentification nécessaire
                    Authenticator.selectSiteRemotely( localSites[0].id, function() {
                        $location.path( '/map/' + localSites[0].id );
                    }, function() {
                        alertify.alert( i18n.get( '_AUTH_UNKNOWN_ERROR_OCCURED_' ) );
                    } );
                } else if (remoteSites.length === 1 && localSites.length <= 1) {
                    // Online avec un site non installé : On l'installe directement
                    $location.path( '/sites/install/' + remoteSites[0].id );
                } else if ((remoteSites.length + localSites.length) > 0) {
                    $location.path( 'sites' );
                } else {
                    alertify.alert( i18n.get( '_AUTH_UNKNOWN_ERROR_OCCURED_' ) );
                }
            } else {
                if (!Site.current) {
                    $location.path( 'sites/' );
                } else {
                    $location.path( 'map/' + Site.current.id );
                }
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
            if (!Storage.get( "url" ) || Storage.get( "url" ).indexOf( intent.url ) === -1) {
                Utils.setGimapUrl( intent.url );
            }
            Authenticator.tokenAuth( intent.token, redirect, redirect );
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
