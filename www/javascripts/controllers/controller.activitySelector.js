(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ActivitySelectorController', ActivitySelectorController );

    ActivitySelectorController.$inject = ["$scope", "$routeParams", "Asset", "$filter", "Activity", "Site", "i18n", "$location"];

    /**
     * @class ActivitySelectorController
     * @desc Controlleur de la page de selection d'activité pour compte rendu
     */

    function ActivitySelectorController($scope, $routeParams, Asset, $filter, Activity, Site, i18n, $location) {

        var vm = this;

        vm.activities = [];
        vm.selected = null;
        vm.assets = null;
        vm.latlng = null;
        vm.cancel = cancel;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            var match;

            if (match = $routeParams.assets.match(/^(\d+);([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/)) {
                vm.assets = match[0];
            } else if (match = $routeParams.assets.match(/^\s*([-+]?\d+[.]?\d+)\s*,\s*([-+]?\d+[.]?\d+)\s*$/)) {
                vm.latlng = match[0];
            } else {
                vm.assets = $routeParams.assets;
            }

            vm.mission = $routeParams.mission;
            vm.site = $routeParams.site;

            if (vm.assets) {
                Asset.emptyCache([vm.assets]);
                var asset = new Asset( vm.assets.split('!')[0], function(newAsset) {
                    vm.activities = $filter('activityListFilter')(newAsset);
                    $scope.$digest();
                });
            } else if (vm.latlng) {
                vm.activities = Activity.getAll();
            }
        }

        /**
         * @name cancel
         * @vm
         * @desc Annule le compte rendu
         */
        function cancel() {
            alertify.confirm(i18n.get('_CANCEL_REPORT_CREATION', Site.current.label), function(yes) {
                if (yes) {
                    $location.path('map/' + Site.current.id);
                    $scope.$apply();
                }
            });
        }
    }
})();
