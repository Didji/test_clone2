(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ConsultationController', ConsultationController );

    ConsultationController.$inject = ["$scope", "$rootScope", "$window", "$location", "Smartgeo", "G3ME", "$timeout", "Site", "Storage"];

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

    function ConsultationController($scope, $rootScope, $window, $location, Smartgeo, G3ME, $timeout, Site, Storage) {

        var vm = this;

        $rootScope.openLocatedReport = vm.openLocatedReport = openLocatedReport;
        vm.toggleConsultationPanel = toggleConsultationPanel;
        vm.close = _close;
        vm.open = _open;
        vm.getMultiselectionAssetsIds = getMultiselectionAssetsIds;
        vm.dropAssetFromMultiselection = dropAssetFromMultiselection;
        vm.emptyMultiselectionForOkey = emptyMultiselectionForOkey;

        vm.metamodel = Site.current.metamodel;
        vm.siteid = Site.current.id;

        vm.isOpen = false;
        vm.loading = false;
        vm.coordinates = {};
        vm.groups = null;
        vm.spinnerOptions = {};
        vm.multiselection = {};

        var PREOPEN_TIMER;

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

            $scope.$on( "UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets) {
                cancelPreopenTimer();
                updateAssetsList( assets );
                $scope.$digest();
            } );

            $rootScope.$on( "UPDATE_CONSULTATION_MULTISELECTION", function(event, asset) {
                addAssetToMultiselection( asset );
            } );

            $rootScope.$on( "UPDATE_DROP_CONSULTATION_MULTISELECTION", function(event, asset) {
                dropAssetFromMultiselection( asset );
            } );

            $scope.$on( "CLOSE_CONSULTATION_PANEL", close );
        }

        /**
         * @name updateAssetsList
         * @desc
         * @param {Array<Object>} assets
         */
        function updateAssetsList(assets) {
            if (assets.length) {
                vm.groups = {};
            } else {
                vm.groups = null;
                return vm.groups;
            }
            for (var i = 0; i < assets.length; i++) {
                vm.groups[assets[i].priority] = vm.groups[assets[i].priority] || {};
                vm.groups[assets[i].priority][assets[i].okey] = vm.groups[assets[i].priority][assets[i].okey] || [];
                vm.groups[assets[i].priority][assets[i].okey].push( assets[i] );
            }
            vm.open();
            vm.loading = false;
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
            }
            vm.multiselection[okey] = [];
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
        }

        /**
         * @name open
         * @desc Oulala faut faire mieux la.
         */
        function _open() {
            G3ME.reduceMapWidth( Smartgeo._SIDE_MENU_WIDTH );
            if (Smartgeo.isRunningOnLittleScreen()) {
                $rootScope.$broadcast( '_MENU_CLOSE_' );
            }
            vm.isOpen = true;
            $( ".consultation-panel" ).first().css( 'width', Smartgeo._SIDE_MENU_WIDTH );
        }

    }

})();
