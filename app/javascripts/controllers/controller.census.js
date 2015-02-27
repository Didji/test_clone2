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
            //Event pour l'édition d'un asset
            $rootScope.$on('START_UPDATE_ASSET', startUpdateAssetHandler);
        }

        /**
         * @name startCensus
         * @desc Initialise un recensement avec un objet correspondant à l'okey passé en parametre ou l'asset (dans le cas de l'édition d'un objet)
         * @param {String} okey Okey de l'objet à recenser
         */
        function startCensus(data) {

            if (data.okey) {

                vm.okey = data.okey;
                vm.asset = data;
            }
            else {

                vm.okey = data;
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
         * Handler pour l'édition d'un asset
         * @param $event
         * @param data
         */
        function startUpdateAssetHandler($event, asset) {
            if (!asset) {
                return;
            }

            asset.findRelated(function (data) {
                if (data !== undefined) {
                    if (data.root == data.id && data.isComplex) {
                        //Cet élément est déjà la racine, on cherche ses enfants

                        var theAsset = formatAsset(data);
                        var complex = new ComplexAsset(null, null, '', theAsset);
                        fillChildren(complex, theAsset.tree, theAsset.relatedAssets, complex);
                        theAsset.root = complex;
                        theAsset.isProject = false;
                        theAsset.relatedAssets = {};
                        startCensus(theAsset);

                    }
                    else {
                        //Pas la racine, il faut retrouver son père (spoiler : c'est Dark Vador, non je déconne c'est root, "je suis gRoot")
                        var root = data.relatedAssets[data.root];
                        var theAsset = formatAsset(root);
                        var complex = new ComplexAsset(null, null, '', theAsset);
                        fillChildren(complex, data.tree, data.relatedAssets, complex);
                        theAsset.root = complex;
                        theAsset.isProject = false;
                        theAsset.relatedAssets = {};
                        startCensus(theAsset);
                    }
                }
                else {
                    var theAsset = formatAsset(asset);
                    var complex = new ComplexAsset(null, null, '', theAsset);
                    theAsset.root = complex;
                    theAsset.isProject = false;
                    startCensus(theAsset);
                }
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
            object.isProject = false;
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
