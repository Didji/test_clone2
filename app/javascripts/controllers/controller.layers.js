(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('LayersController', LayersController);

    LayersController.$inject = ["$rootScope", "G3ME", "i18n"];

    /**
     * @class LayersController
     * @desc Controlleur du menu de changement de visibilité des couches
     *
     * @property {Object} layers Couches de patrimoines
     * @property {Object} groups Groupe de couches
     */

    function LayersController($rootScope, G3ME, i18n) {

        var vm = this;

        vm.refreshView = refreshView;
        vm.updateGroups = updateGroups;

        vm.symbology = window.SMARTGEO_CURRENT_SITE.symbology;
        vm.groups = {};
        vm.layers = {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            var currentMetamodel = {},
                currentLayer,
                visibilities = G3ME.getVisibility();

            for (var okey in window.SMARTGEO_CURRENT_SITE.metamodel) {
                currentMetamodel = window.SMARTGEO_CURRENT_SITE.metamodel[okey];
                if (!(currentMetamodel.group in vm.groups)) {
                    vm.groups[currentMetamodel.group] = {
                        label: currentMetamodel.group,
                        status: true,
                        layers: []
                    };
                }
                currentLayer = {
                    status: (visibilities === false) || !!visibilities[currentMetamodel.okey],
                    label: currentMetamodel.label,
                    okey: currentMetamodel.okey
                };
                vm.groups[currentMetamodel.group].layers.push(currentLayer);
                vm.layers[currentMetamodel.okey] = currentLayer;
            }

            for (var label in vm.groups) {
                checkGroup(vm.groups[label]);
            }

        }

        /**
         * @name checkGroup
         * @desc
         * @param {Object} group Groupe à switcher
         */
        function checkGroup(group) {
            var status = false,
                layers = group.layers;
            for (var i = 0; i < layers.length; i++) {
                status = status || layers[i].status;
            }
            group.status = status;
        }

        /**
         * @name refreshView
         * @desc
         */
        function refreshView() {
            for (var i in vm.groups) {
                checkGroup(vm.groups[i]);
            }
            G3ME.setVisibility(vm.layers);
        }

        /**
         * @name updateGroups
         * @desc
         * @param {Object} group Groupe à mettre à jour
         */
        function updateGroups(group) {
            var status = group.status,
                layers = group.layers;

            for (var i in layers) {
                layers[i].status = status;
            }
            refreshView();
        }
    }
})();