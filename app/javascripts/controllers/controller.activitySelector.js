(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ActivitySelectorController', ActivitySelectorController);

    ActivitySelectorController.$inject = ["$scope", "$routeParams", "Asset", "$filter"];

    /**
     * @class ActivitySelectorController
     * @desc Controlleur de la page de selection d'activité pour compte rendu
     */

    function ActivitySelectorController($scope, $routeParams, Asset, $filter) {

        var vm = this;

        vm.activities = [];
        vm.selected = null;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            vm.assets = $routeParams.assets;
            vm.mission = $routeParams.mission;
            vm.site = $routeParams.site;

            var asset = new Asset($routeParams.assets.split(',')[0], function() {
                vm.activities = $filter('activityListFilter')(asset);
                $scope.$digest();
            });
        }
    }

})();