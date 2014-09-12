(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ConsultationController', ConsultationController);

    ConsultationController.$inject = ["$scope", "$rootScope", "$window", "$location", "Smartgeo", "i18n", "G3ME", "AssetFactory", "$timeout"];

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

    function ConsultationController($scope, $rootScope, $window, $location, Smartgeo, i18n, G3ME, Asset, $timeout) {

        var vm = this;

        vm.openLocatedReport = openLocatedReport;
        vm.toggleConsultationPanel = toggleConsultationPanel;
        vm.close = close;
        vm.open = open;
        vm.addAssetsToMission = addAssetsToMission;
        vm.getMultiselectionAssetsIds = getMultiselectionAssetsIds;

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

            angular.element($window).bind("resize", function() {
                $timeout(vm[!vm.isOpen ? 'close' : 'open'], 100);
            });

            vm.spinnerOptions = {
                radius: 30,
                width: 8,
                length: 16,
                hwaccel: true,
                color: 'white'
            }

            // Lorsque la carte nous informe qu'une consultation est demandée,
            // on prépare une ouverture du panneau de consultation. S'il n'y a
            // pas de résultat, on annulera cette ouverture.
            $scope.$on("CONSULTATION_CLICK_REQUESTED", function(e, coordinates) {
                vm.coordinates = coordinates;
                cancelPreopenTimer();
                PREOPEN_TIMER = $timeout(function() {
                    vm.loading = true;
                    vm.open();
                    $scope.$digest();
                }, 200);
            });

            $scope.$on("CONSULTATION_CLICK_CANCELED", function() {
                cancelPreopenTimer();
                if(!vm.groups){
                    vm.close();
                }
                vm.loading = false;
                $scope.$digest();
            });

            $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets) {
                cancelPreopenTimer();
                updateAssetsList(assets);
                $scope.$digest();
            });

            $rootScope.$on("UPDATE_CONSULTATION_MULTISELECTION", function(event, asset) {
                vm.multiselection[asset.okey] = vm.multiselection[asset.okey] || [] ;
                if(vm.multiselection[asset.okey].indexOf(asset) === -1){
                    vm.multiselection[asset.okey].push(asset);
                }
            });

            $scope.$on("CLOSE_CONSULTATION_PANEL", close);
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
                return vm.groups = null;
            }
            for (var i = 0; i < assets.length; i++) {
                vm.groups[assets[i].priority] = vm.groups[assets[i].priority] || {};
                vm.groups[assets[i].priority][assets[i].okey] = vm.groups[assets[i].priority][assets[i].okey] || [];
                vm.groups[assets[i].priority][assets[i].okey].push(assets[i]);
            }
            vm.open();
            vm.loading = false;
        }

        /**
         * @name openLocatedReport
         * @desc
         * @param {Number} lat
         * @param {Number} lng
         */
        function openLocatedReport(lat, lng) {
            $location.path('report/' + $rootScope.site.id + '/' + $rootScope.report_activity + '/' + lat + ',' + lng + '/');
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
                tmp.push(vm.multiselection[okey][i].id);
            }
            return tmp.join(',');
        }



        /**
         * @name cancelPreopenTimer
         * @desc
         */
        function cancelPreopenTimer() {
            if (PREOPEN_TIMER) {
                $timeout.cancel(PREOPEN_TIMER);
            }
        }

        /**
         * @name close
         * @desc
         */
        function close() {
            G3ME.fullscreen();
            vm.isOpen = false;
            $(".consultation-panel").first().css('width', 0); //TODO(@gulian) : Oulala faut faire mieux la.
        }

        /**
         * @name open
         * @desc
         */
        function open() {
            G3ME.reduceMapWidth(Smartgeo._SIDE_MENU_WIDTH);
            if (Smartgeo.isRunningOnLittleScreen()) {
                $rootScope.$broadcast('_MENU_CLOSE_');
            }
            vm.isOpen = true;
            $(".consultation-panel").first().css('width', Smartgeo._SIDE_MENU_WIDTH); //TODO(@gulian) : Oulala faut faire mieux la.
        }

        /**
         * @name addAssetsToMission
         * @desc
         * @param {Object} asset
         * @param {Object} mission
         * @param {Event} $event
         */
        function addAssetsToMission(asset, mission, $event) {
            if ($event) {
                $event.preventDefault();
            }
            $rootScope.addAssetToMission(asset, mission);
        }

    }

})();