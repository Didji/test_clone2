(function() {
    "use strict";

    angular.module("smartgeomobile").controller("LayersController", LayersController);

    LayersController.$inject = ["G3ME", "Site"];

    /**
     * @class LayersController
     * @desc Controlleur du menu de changement de visibilité des couches
     *
     * @property {Object} layers Couches de patrimoines
     * @property {Object} groups Groupe de couches
     */

    function LayersController(G3ME, Site) {
        var vm = this;

        vm.refreshView = refreshView;
        vm.updateGroups = updateGroups;

        vm.symbology = Site.current.symbology;
        vm.groups = {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            var currentMetamodel = {},
                currentLayer,
                visibilities = G3ME.getVisibility();

            for (var okey in Site.current.metamodel) {
                currentMetamodel = Site.current.metamodel[okey];
                if (!currentMetamodel.is_graphical) {
                    continue;
                }
                vm.groups[currentMetamodel.group] = vm.groups[currentMetamodel.group] || {
                    label: currentMetamodel.group,
                    status: true,
                    layers: {}
                };
                if (window.SMARTGEO_CURRENT_SITE_IMG[currentMetamodel.okey + "0"]) {
                    currentLayer = {
                        status: !visibilities || visibilities[currentMetamodel.okey],
                        label: currentMetamodel.label,
                        okey: currentMetamodel.okey,
                        src: window.SMARTGEO_CURRENT_SITE_IMG[currentMetamodel.okey + "0"].src
                    };
                    vm.groups[currentMetamodel.group].layers[currentLayer.okey] = currentLayer;
                }
            }

            for (var label in vm.groups) {
                checkGroup(vm.groups[label]);
            }
        }

        /**
         * @name checkGroup
         * @desc Active un groupe entier
         * @param {Object} group Groupe à switcher
         */
        function checkGroup(group) {
            var status = group.status,
                layers = group.layers;
            for (var i = 0; i < layers.length; i++) {
                status = status || layers[i].status;
            }
            group.status = status;
        }

        /**
         * @name refreshView
         * @desc Rafraichi la carte
         */
        function refreshView() {
            for (var i in vm.groups) {
                checkGroup(vm.groups[i]);
            }
            G3ME.setVisibility(vm.groups);
        }

        /**
         * @name updateGroups
         * @desc Met à jour les groupes
         */
        function updateGroups(group) {
            for (var i in group.layers) {
                group.layers[i].status = group.status;
            }
            refreshView();
        }
    }
})();
