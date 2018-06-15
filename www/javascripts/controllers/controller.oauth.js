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

    	var vm = this,
    		localSites = [],
    		installed = false;

    	vm.pickAccounts = pickAccounts;
    	vm.close = close;

    	vm.loginInProgress = false;
    	vm.errorMessage = null;

    	activate();


    	function activate() {
			console.log("prefetchedlocalsites");
			console.log(prefetchedlocalsites);
    		var	tmp = prefetchedlocalsites;

    		localSites = [];
    		for (var site in tmp) {
    		    localSites.push( tmp[site] );
    		}

    		installed = localSites.length === 1 && !!localSites[0].installed;

    	    pickAccounts();
    	}

    	function pickAccounts() {
    	    vm.loginInProgress = true;
    	    vm.errorMessage = null;
    	    GoogleGi.pickAccounts(i18n.get('OAUTH_PICK_ACCOUNTS'), handlePickAccountsSuccess, handlePickAccountsError);
            if ( installed ) {
                $location.path( '/map/' + localSites[0].id );
            }
    	}

    	function close() {
    	    navigator.app.exitApp();
    	}

    	function handlePickAccountsSuccess(data) {
    		var	online = Storage.get( 'online' );

    		if (data.url.length === 0) {
    		    data.url = LicenseManager.serverUrl;
    		}

    		if (!Storage.get( "url" ) || Storage.get( "url" ).indexOf( data.url ) === -1) {
    		    Utils.setGimapUrl( data.url );
    		}

            if ( !installed && !online ) {
    			displayError();
    		}

    		if ( online ) {
    			Authenticator.tokenAuth( data.token, handleAuthSuccess, displayError );
    		}
    	}

    	function handlePickAccountsError(error) {
            displayError( error );
    	}

    	function handleAuthSuccess(data) {
    		var remoteSites = [];

    		if (data && data.sites) {
    		    for (var site in data.sites) {
    		        if (!data.sites[site].isAdmin && !data.sites[site].isAdminCarto) {
    		            remoteSites.push( data.sites[site] );
    		        }
    		    }
    		}

    		if (remoteSites.length === 1 && installed && localSites[0].id === remoteSites[0].id) {
    		    Authenticator.selectSiteRemotely(
    		    	localSites[0].id,
    		    	function() {
    		    		console.info('Successful authentication.');
    		    	},
    		    	function() {
    					displayError();
    				}
    		    );
    		} else if (remoteSites.length === 1 && !installed) {
    		    //$location.path( '/sites/install/' + remoteSites[0].id );
    		} else {
    			displayError();
			}
    	}

    	function displayError(error) {
            vm.loginInProgress = false;
            vm.errorMessage = error ? i18n.get( error ) : i18n.get( 'OAUTH_UNKNOWN_ERROR' );
            if ( !$scope.$$phase ) {
                $scope.$apply();
            }
        }

    }

} )();
