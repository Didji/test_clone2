(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('CensusController', CensusController);

    CensusController.$inject = ["Site", "$rootScope", "Asset", "$scope", "ComplexAsset"];

    /**
     * @class CensusController
     * @desc Controlleur du menu de recensement
     *
     * @property {String} classindex Okey de l'objet recencé en cours
     */
    function CensusController(Site, $rootScope, Asset, $scope, ComplexAsset) {

        var vm = this;

        vm.startCensus = startCensus;
        vm.cancel = cancel;
        vm.symbology = Site.current.symbology;
        vm.dependancies = Site.current.dependancies;
        vm.metamodel = Site.current.metamodel;
        vm.asset = {};

        vm.classindex = "";


        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            vm.classindex = "0";
            $rootScope.$on('START_NEW_CENSUS', startNewCensusEventHandler);
        }

        /**
         * @name startCensus
         * @desc Initialise un recensement avec un objet correspondant à l'okey passé en parametre
         * @param {String} okey Okey de l'objet à recenser
         */
        function startCensus(asset) {

            if (asset.okey) {
                vm.okey = asset.okey;
                vm.asset = asset;
            }
            else {
                vm.okey = asset;
                vm.asset = null;
            }

            if (!$scope.$$phase) {
                $scope.$digest();
            }
        }

        /**
         * @name cancel
         * @desc Annule le recensement en cours
         */
        function cancel() {
            vm.okey = null;
        }

        /**
         *
         * @param $event
         * @param data
         */
        function startNewCensusEventHandler($event, asset) {
            if (!asset) {
                return;
            }

            asset.findRelated(function (data) {

                console.log('data',data);

                var theAsset = formatAsset(data);
                console.log('formatedasset',theAsset);

                var root = theAsset.relatedAssets[theAsset.root];

                console.log('root',root);

                var complex = new ComplexAsset(null, null, '', root);
                fillChildren(complex, theAsset.tree, theAsset.relatedAssets, complex);
                console.log(complex);
                startCensus(complex);

            })

        }

        /**
         * Mise en forme de l'asset
         * @param asset
         */
        function formatAsset(asset, father) {
            var object = new ComplexAsset(asset.okey);
            object.id = asset.id;
            object.fields = asset.attributes;
            object.children = [];
            object.root = asset.root;
            object.father = father && father.id;
            object.tree = asset.tree;
            object.relatedAssets = asset.relatedAssets;
            object.guid = asset.guid;
            object.geometry = asset.geometry
            return object;
        }

        /**
         * Parcourt l'arbre à partir de la racine et remplit les enfants
         * @param node
         */
        function fillChildren(node, tree, relatedAssets, rootId) {
            if (tree) {
                node.children = node.children || [];
                for (var id in tree[node.id]) {
                    var j = tree[node.id][id];
                    relatedAssets[j].root = rootId;
                    node.children.push(formatAsset(relatedAssets[j], node))
                }
            }

            if (!node.children.length) {
                return;
            }

            for (var i = 0; i < node.children.length; i++) {
                fillChildren(node.children[i], tree, relatedAssets, rootId);
            }

        }
    }

})();
