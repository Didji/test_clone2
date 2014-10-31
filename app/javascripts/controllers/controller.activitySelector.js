(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ActivitySelectorController', ActivitySelectorController);

    ActivitySelectorController.$inject = ["$scope", "$routeParams", "Asset", "$filter", "Activity"];

    /**
     * @class ActivitySelectorController
     * @desc Controlleur de la page de selection d'activité pour compte rendu
     */

    function ActivitySelectorController($scope, $routeParams, Asset, $filter, Activity) {

        var vm = this;

        vm.activities = [];
        vm.selected = null;
        vm.assets = null;
        vm.latlng = null;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            var match ;

            if ((match = $routeParams.assets.match(/^(\d+);([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/))) {
                vm.assets = match[0];
            } else if ((match = $routeParams.assets.match(/^([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/))) {
                vm.latlng = match[0];
            } else {
                vm.assets = $routeParams.assets.split(',');
            }

            vm.mission = $routeParams.mission;
            vm.site = $routeParams.site;

            if(vm.asset){
                var asset = new Asset($routeParams.assets.split(',')[0], function () {
                    vm.activities = $filter('activityListFilter')(asset);
                    $scope.$digest();
                });
            } else if(vm.latlng){
                vm.activities = Activity.getAll();
            }

        }
    }

})();
