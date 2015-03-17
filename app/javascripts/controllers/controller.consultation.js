(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ConsultationController', ConsultationController );

    ConsultationController.$inject = ["$scope", "$rootScope", "$window", "$location", "Smartgeo", "G3ME", "$timeout", "Site", "Storage", "Project", "Asset", "i18n"];

    /**
     * @class ConsultationController
     * @desc Controlleur de la page de consultation.
     *
     * @property {Boolean}  isOpen
     * @property {Boolean}  loading
     * @property {L.LatLng} coordinates
     * @property {Object}   groups
     * @property {Object}   spinnerOptions
     */

    function ConsultationController($scope, $rootScope, $window, $location, Smartgeo, G3ME, $timeout, Site, Storage, Project, Asset, i18n) {

        var vm = this;

        $rootScope.openLocatedReport = vm.openLocatedReport = openLocatedReport;

        vm.close = _close;
        vm.open = _open;
        vm.getMultiselectionAssetsIds = getMultiselectionAssetsIds;
        vm.dropAssetFromMultiselection = dropAssetFromMultiselection;
        vm.emptyMultiselectionForOkey = emptyMultiselectionForOkey;
        vm.addMultiselectionToCurrentProject = addMultiselectionToCurrentProject;
        vm.deleteAssets = deleteAssets;

        vm.metamodel = Site.current.metamodel;
        vm.siteid = Site.current.id;
        vm.currentLoadedProject = Project.currentLoadedProject ;
        vm.isOpen = false;
        vm.loading = false;
        vm.coordinates = {};
        vm.groups = null;
        vm.spinnerOptions = {};
        vm.multiselection = {};
        vm.selectedAssets = {
            inList: {},
            inMulti: {}
        };

        var PREOPEN_TIMER, initialXPosition, initialWidth,
            currentXPosition,
            movePhase,
            finalXPosition;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            angular.element( $window ).bind( "resize", function() {
                $timeout( vm[!vm.isOpen ? 'close' : 'open'], 100 );
            } );

            // Lorsque la carte nous informe qu'une consultation est demandée,
            // on prépare une ouverture du panneau de consultation. S'il n'y a
            // pas de résultat, on annulera cette ouverture.
            $scope.$on( "CONSULTATION_CLICK_REQUESTED", function(e, coordinates) {
                vm.coordinates = coordinates;
                cancelPreopenTimer();
                PREOPEN_TIMER = $timeout( function() {
                    vm.loading = true;
                    vm.open();
                    $scope.$digest();
                }, 200 );
            } );

            $scope.$on( "CONSULTATION_CLICK_CANCELED", function() {
                cancelPreopenTimer();
                if (!vm.groups) {
                    vm.close();
                }
                vm.loading = false;
                $scope.$digest();
            } );

            $scope.$on( "UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets, coordinates) {
                if (coordinates === false) {
                    vm.coordinates = coordinates;
                }
                cancelPreopenTimer();
                updateAssetsList( assets || [] );
                if (!assets) {
                    return _close();
                }
                $scope.$digest();
            } );

            $rootScope.$on( "UPDATE_CONSULTATION_MULTISELECTION", function(event, asset) {
                addAssetToMultiselection( asset );
            } );

            $rootScope.$on( "UPDATE_DROP_CONSULTATION_MULTISELECTION", function(event, asset) {
                dropAssetFromMultiselection( asset );
            } );

            $scope.$on( "CLOSE_CONSULTATION_PANEL", close );

            $rootScope.$on( "NEW_PROJECT_LOADED", function() {
                vm.currentLoadedProject = Project.currentLoadedProject ;
            } );

            $rootScope.$on( "_REMOTE_DELETE_ASSETS_", function(event, guids) {
                dropAssetsFromListAndMulti( guids );
            } );

            $rootScope.$on( "REFRESH_CONSULTATION", function() {
                var ids = [];
                for (var id in vm.selectedAssets.inList) {
                    ids.push( id );
                }
                Asset.cache = {} ;

                Asset.findAssetsByGuids( ids, function(results) {
                    var assets = [];
                    for (var i = 0; i < results.length; i++) {
                        assets.push( new Asset( Asset.convertRawRow( results[i] ) ) );
                    }
                    $rootScope.$broadcast( "UPDATE_CONSULTATION_ASSETS_LIST", assets );
                    $scope.$digest();
                } );


            } );

            $( '.toggleConsultationPanelButton' ).bind( 'touchstart touchmove mousedown', toggleConsultationPanelButtonMousedownHandler );

        }

        /**
         * @name updateAssetsList
         * @desc
         * @param {Array<Object>} assets
         */
        function updateAssetsList(assets) {
            if (assets.length) {
                vm.groups = {};
                vm.selectedAssets.inList = {};
            } else {
                vm.groups = null;
                vm.selectedAssets.inList = null;
                return vm.groups;
            }
            for (var i = 0; i < assets.length; i++) {
                vm.groups[assets[i].priority] = vm.groups[assets[i].priority] || {};
                vm.groups[assets[i].priority][assets[i].okey] = vm.groups[assets[i].priority][assets[i].okey] || [];
                vm.groups[assets[i].priority][assets[i].okey].push( assets[i] );
                vm.selectedAssets.inList[assets[i].guid] = assets[i];
            }
            vm.open();
            vm.loading = false;
        }

        function reloadAssetSheet(asset) {
            vm.groups[asset.priority] = vm.groups[asset.priority] || {};
            vm.groups[asset.priority][asset.okey] = vm.groups[asset.priority][asset.okey] || [];
            vm.groups[asset.priority][asset.okey].push( asset );
            vm.selectedAssets.inList[asset.guid] = asset;
            $scope.$digest();
        }

        /**
         * @name  dropAssetsFromListAndMulti
         * @desc
         * @param  {Array} guids
         */
        function dropAssetsFromListAndMulti(guids) {
            angular.forEach( guids, function(guid) {
                if (vm.selectedAssets.inMulti[guid]) {
                    dropAssetFromMultiselection( vm.selectedAssets.inMulti[guid] );
                }
                if (vm.selectedAssets.inList && vm.selectedAssets.inList[guid]) {
                    dropAssetFromList( vm.selectedAssets.inList[guid] );
                }
                $scope.$digest();
            } );
        }

        /**
         * @name dropAssetFromList
         * @desc
         * @param {Asset}
         */
        function dropAssetFromList(asset) {
            vm.groups[asset.priority][asset.okey].splice( vm.groups[asset.priority][asset.okey].indexOf( asset ), 1 );
            delete vm.selectedAssets.inList[asset.guid];
        }

        /**
         * @name addAssetToMultiselection
         * @desc
         * @param {Asset} asset
         */
        function addAssetToMultiselection(asset) {
            if (!vm.multiselection[asset.okey]) {
                vm.multiselection[asset.okey] = [];
            }
            vm.multiselection.length = (vm.multiselection.length || 0) + 1;
            if (vm.multiselection[asset.okey].indexOf( asset ) === -1) {
                vm.multiselection[asset.okey].push( asset );
                vm.selectedAssets.inMulti[asset.guid] = asset;
            }
            asset.isInMultiselection = true;
        }


        /**
         * @name dropAssetFromMultiselection
         * @desc
         * @param {Asset} asset
         */
        function dropAssetFromMultiselection(asset) {
            vm.multiselection[asset.okey].splice( vm.multiselection[asset.okey].indexOf( asset ), 1 );
            delete vm.selectedAssets.inMulti[asset.guid];
            asset.isInMultiselection = false;
            vm.multiselection.length--;
        }

        /**
         * @name emptyMultiselectionForOkey
         * @desc
         * @param {String} okey
         */
        function emptyMultiselectionForOkey(okey) {
            vm.multiselection.length -= vm.multiselection[okey].length;
            for (var i = 0; i < vm.multiselection[okey].length; i++) {
                vm.multiselection[okey][i].isInMultiselection = false;
                delete vm.selectedAssets.inMulti[vm.multiselection[okey][i].guid];
            }
            vm.multiselection[okey] = [];
        }

        /**
         * @name addMultiselectionToCurrentProject
         * @desc
         * @param {String} okey
         */
        function addMultiselectionToCurrentProject(okey) {
            vm.currentLoadedProject.addAssets( vm.multiselection[okey], function() {
                alertify.alert( i18n.get( "_PROJECT_ASSETS_ADDED_", vm.currentLoadedProject.name ) );
                $rootScope.$broadcast( "UPDATE_PROJECTS" );
            } );
        }

        /**
         * @name openLocatedReport
         * @desc
         * @param {Number} lat
         * @param {Number} lng
         */
        function openLocatedReport(lat, lng) {
            var intent = Storage.get( 'intent' ),
                path = 'report/' + Site.current.id + '/';

            path += (intent ? intent.report_activity : '') + '/' + lat + ',' + lng + '/';

            if (intent && intent.report_mission) {
                path += intent.report_mission + '/';
            }

            $location.path( path );
        }

        function toggleConsultationPanelButtonMousedownHandler($event) {
            movePhase = 0;

            $( '.toggleConsultationPanelButton' ).unbind( 'touchstart touchmove', toggleConsultationPanelButtonMousedownHandler );


            initialXPosition = $event.clientX;
            initialWidth = Smartgeo._SIDE_MENU_WIDTH;
            $( window ).bind( 'mousemove touchmove', mousemoveHandler );
            $( window ).bind( 'mouseup touchend', mouseupHandler );

            if (navigator.userAgent.match( /Android/i )) {
                $event.preventDefault();
            }
        }

        function mousemoveHandler($event) {
            $event.preventDefault();
            currentXPosition = $event.clientX ;
            if (!currentXPosition) {
                currentXPosition = $event.originalEvent.touches[0].clientX;
            }
            if (!(++movePhase % 5) && Math.abs(( initialXPosition - currentXPosition )) > 30) {
                Smartgeo._SIDE_MENU_WIDTH = initialWidth + (initialXPosition - currentXPosition);
                $( ".consultation-panel" ).first().css( 'width', Smartgeo._SIDE_MENU_WIDTH );
                G3ME.reduceMapWidth( Smartgeo._SIDE_MENU_WIDTH );
            }
            if (vm.isOpen === false && Smartgeo._SIDE_MENU_WIDTH >= 80) {
                _open();
            } else if (Smartgeo._SIDE_MENU_WIDTH < 80) {
                _close();
            }
        }

        function mouseupHandler($event) {
            $( window ).unbind( 'mousemove touchmove', mousemoveHandler );
            $( window ).unbind( 'mouseup touchend', mouseupHandler );
            finalXPosition = $event.clientX;
            movePhase = 0;
            if (Math.abs(( initialXPosition - finalXPosition )) < 20) {

                toggleConsultationPanel();
            }
            $( '.toggleConsultationPanelButton' ).bind( 'touchmove', toggleConsultationPanelButtonMousedownHandler );

        }

        /**
         * @name toggleConsultationPanel
         * @desc
         */
        function toggleConsultationPanel() {
            vm[vm.isOpen ? 'close' : 'open']();
        }

        /**
         * @name toggleConsultationPanel
         * @desc
         * @param {String} okey
         * @returns {String} Liste des ids pour un okey de la selection multiple
         */
        function getMultiselectionAssetsIds(okey) {

            var tmp = [];
            for (var i = 0; i < vm.multiselection[okey].length; i++) {
                tmp.push( vm.multiselection[okey][i].id );
            }
            return tmp.join( ',' );
        }

        /**
         * @name cancelPreopenTimer
         * @desc
         */
        function cancelPreopenTimer() {
            if (PREOPEN_TIMER) {
                $timeout.cancel( PREOPEN_TIMER );
            }
        }

        /**
         * @name close
         * @desc Oulala faut faire mieux la.
         */
        function _close() {
            G3ME.fullscreen();
            vm.isOpen = false;
            $( ".consultation-panel" ).first().css( 'width', 0 );
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        }

        /**
         * @name open
         * @desc Oulala faut faire mieux la.
         */
        function _open() {
            if (Smartgeo._SIDE_MENU_WIDTH > window.innerWidth) {
                Smartgeo._SIDE_MENU_WIDTH = window.innerWidth - 70;
            }
            G3ME.reduceMapWidth( Smartgeo._SIDE_MENU_WIDTH );
            if (Smartgeo.isRunningOnLittleScreen()) {
                $rootScope.$broadcast( '_MENU_CLOSE_' );
            }
            vm.isOpen = true;
            $( ".consultation-panel" ).first().css( 'width', Smartgeo._SIDE_MENU_WIDTH );
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        }

        /**
         * @desc Supprime les objets de la multiselection
         * @param {Array} assets
         */
        function deleteAssets(assets) {
            alertify.confirm( i18n.get( '_CONFIRM_DELETE_ASSETS_' ), function(yes) {
                if (!yes) {
                    return;
                }
                var notUpdatableAssets = [];

                angular.forEach( assets, function(asset, index) {
                    if (asset.attributes._rights !== 'U') {
                        notUpdatableAssets.push( asset.label );
                        assets.splice( index, 1 );
                    } else if (Project.currentLoadedProject.assets.indexOf( asset.id ) > -1) {
                        Project.currentLoadedProject.deleteAsset( asset );
                        assets.splice( index, 1 );
                    }
                } );

                if (notUpdatableAssets.length) {
                    alertify.alert( i18n.get(
                        notUpdatableAssets.length === 1 ? '_NOT_ALLOWED_TO_DELETE_ASSET_' : '_NOT_ALLOWED_TO_DELETE_ASSETS_',
                        [notUpdatableAssets.join( "," )]
                    ) );
                }

                if (assets.length) {
                    Asset.remoteDeleteAssets( assets );
                }
            } );
        }

    }

})();
