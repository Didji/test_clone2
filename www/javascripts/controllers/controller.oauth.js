( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'OauthController', OauthController );

    OauthController.$inject = [ "$scope", "$location", "prefetchedlocalsites", "Authenticator", "Storage", "Utils", "i18n", "LicenseManager" ];

    /**
     * @class OauthController
     * @desc Controlleur du menu de gestion de Oauth
     */
    function OauthController($scope, $location, prefetchedlocalsites, Authenticator, Storage, Utils, i18n, LicenseManager) {

        var vm = this;

        vm.pickAccounts = pickAccounts;
        vm.close = close;

        vm.loginInProgress = false;
        vm.errorMessage = null;

        activate();

        function activate() {
            pickAccounts();
        }

        function pickAccounts() {
            vm.loginInProgress = true;
            vm.errorMessage = null;
            GoogleGi.pickAccounts(i18n.get('OAUTH_PICK_ACCOUNTS'), handleSuccess, handleJavaError);
        }

        function close() {
            navigator.app.exitApp();
        }

        function handleSuccess(data) {
            if (data.url.length === 0) {
                data.url = LicenseManager.serverUrl;
            }
            if (!Storage.get( "url" ) || Storage.get( "url" ).indexOf( data.url ) === -1) {
                Utils.setGimapUrl( data.url );
            }
            Authenticator.tokenAuth( data.token, redirect, handleError );
        }

        function handleJavaError(error) {
            // Comme on passe par un plugin java le scope mis à jour en dehors
            // de la phase de digest : il faut donc avoir recours au $apply
            $scope.$apply( function() {
                if ( error === 'OAUTH_NETWORK_ERROR' ) {
                    redirect( null, i18n.get( error ) );
                }
                handleError( i18n.get( error ) );
            });
        }

        function handleError(error) {
            vm.loginInProgress = false;
            vm.errorMessage = error ? error : i18n.get( 'OAUTH_UNKNOWN_ERROR');
        }

        function redirect(data, error) {
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
                    handleError(error);
                } );
            } else if (remoteSites.length === 1 && localSites.length <= 1) {
                // Online avec un site non installé : On l'installe directement
                $location.path( '/sites/install/' + remoteSites[0].id );
            } else if ((remoteSites.length + localSites.length) > 0) {
                $location.path( 'sites' );
            } else {
                handleError(error);
            }
        }

    }

} )();
