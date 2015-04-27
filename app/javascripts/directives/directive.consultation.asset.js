(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .directive( 'assetConsultation', assetConsultation );

    assetConsultation.$inject = ["$rootScope", "Asset", "Site", "Project", "i18n", "Synchronizator", "Storage"];

    function assetConsultation($rootScope, Asset, Site, Project, i18n, Synchronizator, Storage) {

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

        function link(scope) {

            scope.asset.findRelated( function() {
                scope.$digest();
            } );

            /* Scope Attributes */
            scope.site = Site.current;
            scope.rights = $rootScope.rights;
            scope.missions = $rootScope.missions;
            scope.currentLoadedProject = Project.currentLoadedProject ;

            /* Scope Methodes */
            scope.addToCurrentProject = addToCurrentProject;
            scope.addToCurrentSelection = addToCurrentSelection;
            scope.dropFromCurrentSelection = dropFromCurrentSelection;
            scope.toggleMapVisibility = toggleMapVisibility;
            scope.openInApp = openInApp;
            scope.deleteAsset = deleteAsset;
            scope.markObjectAsDeletedForCurrentProject = markObjectAsDeletedForCurrentProject;
            scope.exec = exec;
            scope.removeFromProject = removeFromProject ;

            scope.$on( '$destroy', destroy );

            /**
             * @name addToCurrentSelection
             * @param {Asset} asset
             */
            function addToCurrentProject(asset) {
                Project.currentLoadedProject.addAsset( asset, function() {
                    alertify.log( i18n.get( "_PROJECT_ASSETS_ADDED_", Project.currentLoadedProject.name ) );
                    $rootScope.$broadcast( "UPDATE_PROJECTS" );
                    scope.$apply();
                }, true );
            }

            function markObjectAsDeletedForCurrentProject(asset) {
                Project.currentLoadedProject.deleteAsset( asset, function() {
                    alertify.log( i18n.get( "_PROJECT_ASSETS_DELETED_", Project.currentLoadedProject.name ) );
                    $rootScope.$broadcast( "UPDATE_PROJECTS" );
                    scope.$apply();
                } );
            }

            /**
             * @name removeFromProject
             * @param {Asset} asset
             */
            function removeFromProject(asset) {
                Project.currentLoadedProject.removeAsset( asset, function() {
                    alertify.log( i18n.get( "_PROJECT_ASSETS_REMOVED_", Project.currentLoadedProject.name ) );
                    $rootScope.$broadcast( "UPDATE_PROJECTS" );
                    scope.$apply();
                } );
            }

            /**
             * @name addToCurrentSelection
             * @param {Event} event
             */
            function addToCurrentSelection(asset) {
                $rootScope.$broadcast( "UPDATE_CONSULTATION_MULTISELECTION", asset );
                asset.isInMultiselection = true;
            }

            /**
             * @name dropFromCurrentSelection
             * @desc
             */
            function dropFromCurrentSelection(asset) {
                $rootScope.$broadcast( "UPDATE_DROP_CONSULTATION_MULTISELECTION", asset );
                asset.isInMultiselection = false;
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

            function toggleMapVisibility(asset, dontPlaceMarker) {
                asset.toggleMapVisibility(dontPlaceMarker);
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
                    asset.payload = [{
                        okey: asset.okey,
                        guid: asset.guid
                    }];

                    if (asset.relatedAssets) {
                        for (var i in asset.relatedAssets) {
                            asset.payload.push( {
                                okey: asset.relatedAssets[i].okey,
                                guid: asset.relatedAssets[i].guid
                            } );
                            asset.relatedAssets[i].hideFromMap();

                        }
                    }
                    asset.hideFromMap();
                    asset.timestamp = Date.now();

                    Synchronizator.addDeleted( asset );
                } );
            }

            /**
             * @name exec
             * @desc
             * @param  {String} method
             */
            function exec(method) {
                method = method.split( '.' );
                if (method[0] === "asset") {
                    scope.asset[method[1]]();
                } else {
                    eval( method[1] + '(scope.asset);' );
                }
            }
        }
    }

})();
