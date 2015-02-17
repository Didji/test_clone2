(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .directive( 'assetConsultation', assetConsultation );

    assetConsultation.$inject = ["$rootScope", "Asset", "Site", "Project", "i18n"];

    function assetConsultation($rootScope, Asset, Site, Project, i18n) {

        var directive = {
            link: link,
            templateUrl: 'javascripts/directives/template/consultation.asset.html',
            restrict: 'EA',
            scope: {
                'asset': '=',
                'noButton': '@'
            }
        };
        return directive;

        function link(scope, element) {
            // scope.asset = !(scope.asset instanceof Asset) ? new Asset( scope.asset ) : scope.asset;
            scope.asset.findRelated( function() {
                scope.$digest();
            } );
            scope.site = Site.current;
            scope.rights = $rootScope.rights;
            scope.missions = $rootScope.missions;
            scope.currentLoadedProject = Project.currentLoadedProject ;

            scope.addToCurrentProject = addToCurrentProject;
            scope.addToCurrentSelection = addToCurrentSelection;
            scope.dropFromCurrentSelection = dropFromCurrentSelection;
            scope.toggleMapVisibility = toggleMapVisibility;
            scope.openInApp = openInApp;
            scope.deleteAsset = deleteAsset;

            scope.$on( '$destroy', destroy );


            /**
             * @name addToCurrentSelection
             * @param {Event} event
             */
            function addToCurrentProject(asset) {
                Project.currentLoadedProject.addAsset( asset, function() {
                    alertify.alert( i18n.get( "_PROJECT_ASSETS_ADDED_", scope.currentLoadedProject.name ) );
                    $rootScope.$broadcast( "UPDATE_PROJECTS" );
                } );
            }

            /**
             * @name addToCurrentSelection
             * @param {Event} event
             */
            function addToCurrentSelection(asset, event) {
                sendAssetToHeaven( event );
                $rootScope.$broadcast( "UPDATE_CONSULTATION_MULTISELECTION", asset );
            }

            /**
             * @name dropFromCurrentSelection
             * @desc
             */
            function dropFromCurrentSelection(asset) {
                $rootScope.$broadcast( "UPDATE_DROP_CONSULTATION_MULTISELECTION", asset );
            }

            /**
             * @name openInApp
             * @desc
             * @param {String} url
             * @param {Event} event
             */
            function openInApp(url, event) {
                event.preventDefault();
                if (window.SmartgeoChromium && window.SmartgeoChromium.redirect) {
                    SmartgeoChromium.redirect( url );
                } else {
                    window.open( url, '_system' );
                }
            }

            /**
             * @name sendAssetToHeaven
             * @desc
             * @param {Event} event
             */
            function sendAssetToHeaven(event) {
                var html = '' + scope.site.metamodel[scope.asset.okey].label + ':' + scope.asset.label + '';
                var x = event.pageX,
                    y = event.pageY;
                var angel = $( '<div>' ).addClass( 'angel' ).appendTo( element ).html( html ).css( {
                    position: 'fixed',
                    top: y,
                    left: x - 100
                } );
                setTimeout( function() {
                    angel.addClass( 'ascending' );
                }, 1000 );
            }

            function toggleMapVisibility(asset) {
                asset.toggleMapVisibility();
            }

            /**
             * @name destroy
             * @desc
             */
            function destroy() {
                scope.asset.hideFromMap();
            }

            /**
             * @name deleteAsset
             * @desc
             * @param  {Object} asset
             */
            function deleteAsset(asset) {
                alertify.confirm( i18n.get( '_CONFIRM_DELETE_ASSET_' ), function(yes) {
                    if (!yes) {
                        return;
                    }

                    if ( Project.currentLoadedProject.assets.indexOf( asset.id ) > -1 ) {
                        Project.currentLoadedProject.deleteAsset( asset );
                    } else {
                        Asset.remoteDeleteAssets([asset]);
                    }

                } );
            }

        }

    }

})();
