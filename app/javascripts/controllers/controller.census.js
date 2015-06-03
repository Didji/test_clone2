(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'CensusController', CensusController );

    CensusController.$inject = ["Site", "$rootScope", "Asset", "$scope", "ComplexAsset", "Relationship", "Project"];

    /**
     * @class CensusController
     * @desc Controlleur du menu de recensement
     *
     * @property {String} classindex Okey de l'objet recencé en cours
     */
    function CensusController(Site, $rootScope, Asset, $scope, ComplexAsset, Relationship, Project) {

        var vm = this;

        vm.startCensus = startCensus;
        vm.close = close_;

        vm.symbology = Site.current.symbology;
        vm.dependancies = Site.current.dependancies;
        vm.metamodel = Site.current.metamodel;
        vm.isProject = !!Project.currentLoadedProject;

        $rootScope.$on( 'NEW_PROJECT_LOADED', function() {
            vm.isProject = true;
        });
        $rootScope.$on( 'OLD_PROJECT_UNLOADED', function() {
            vm.isProject = false;
        } );

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
            $rootScope.$on( 'START_UPDATE_ASSET', startUpdateAssetHandler );
        }

        /**
         * @name startCensus
         * @desc Initialise un recensement avec un objet correspondant à l'okey passé en parametre ou l'asset (dans le cas de l'édition d'un objet)
         * @param {String} okey Okey de l'objet à recenser
         */
        function startCensus(data) {

            $rootScope.stopConsultation();

            if (data.okey) {

                vm.okey = data.okey;
                vm.asset = data;
            } else {

                vm.okey = data;
                vm.asset = null;
            }

            if (!$scope.$$phase) {
                $scope.$digest();
            }
        }

        /**
         * @name close_
         * @desc Ferme le recensement en cours
         */
        function close_() {
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


            var isProjectAsset = (asset.okey.search( 'PROJECT_' ) === 0);

            if (isProjectAsset) {
                vm.classindex = Project.currentLoadedProject.getClassIndexForUpdatedAsset( asset.okey );
            }

            asset.findRelated( function(data) {
                var theAsset, complex;
                if (data !== undefined) {
                    if ((data.root === data.id || +data.root === +data.id) && data.isComplex) {
                        //Cet élément est déjà la racine, on cherche ses enfants
                        theAsset = formatAsset( data );
                        complex = new ComplexAsset( null, null, '', theAsset );
                        fillChildren( complex, theAsset.tree, theAsset.relatedAssets, complex );
                        theAsset.root = complex;
                        theAsset.isProject = isProjectAsset;
                        theAsset.relatedAssets = {};
                        fixTypeField( theAsset );
                        startCensus( theAsset );
                    } else {
                        Relationship.findRoot( data.id, function(r) {
                            Asset.findOne( r, function(root) {
                                theAsset = formatAsset( root );
                                complex = new ComplexAsset( null, null, '', theAsset );
                                fillChildren( complex, data.tree, data.relatedAssets, complex );
                                theAsset.root = complex;
                                theAsset.isProject = isProjectAsset;
                                theAsset.relatedAssets = {};
                                fixTypeField( theAsset );
                                startCensus( theAsset );
                            } );
                        } );

                    }
                } else {
                    theAsset = formatAsset( asset );
                    complex = new ComplexAsset( null, null, '', theAsset );
                    theAsset.root = complex;
                    theAsset.isProject = isProjectAsset;
                    fixTypeField( theAsset );
                    startCensus( theAsset );
                }
            } );
        }



        /**
         * Mise en forme de l'asset
         * @param asset
         */
        function formatAsset(asset, father) {
            var object = new ComplexAsset( asset.okey );
            object.id = asset.id;
            object.fields = asset.attributes;
            object.children = [];
            object.root = asset.root;
            object.father = father && father.uuid;
            object.tree = asset.tree;
            object.relatedAssets = asset.relatedAssets;
            object.guid = asset.guid;
            object.geometry = asset.geometry;
            object.isProject = false;
            object.angle = vm.metamodel[asset.okey].angle;
            return object;
        }


        function fixTypeField(complex) {
            if (complex.children.length) {
                for (var k = 0, kk = complex.children.length; k < kk; k++) {
                    fixTypeField( complex.children[k] );
                }
            }

            var tab, field, idValue;
            for (var i = 0, ii = vm.metamodel[complex.okey].tabs.length; i < ii; i++) {
                tab = vm.metamodel[complex.okey].tabs[i];
                for (var j = 0, jj = tab.fields.length; j < jj; j++) {
                    field = tab.fields[j];
                    if (complex.fields[field.key] && field.type === "L") {
                        for (idValue in Site.current.lists[field.options]) {
                            if (complex.fields[field.key] == Site.current.lists[field.options][idValue]) {
                                complex.fields[field.key] = idValue;
                            }
                        }
                    }
                    if (complex.fields[field.key] && field.type === "D" && !angular.isDate(complex.fields[field.key])) {
                        var pattern = /(\d{2})\/(\d{2})\/(\d{2})/;
                        complex.fields[field.key] = new Date(complex.fields[field.key].replace(pattern,'20$3-$2-$1'));
                    }
                    if (complex.fields[field.key] && field.type === "N") {
                        complex.fields[field.key] = +(""+complex.fields[field.key]).replace(",", ".");
                    }
                }
            }

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
                    node.children.push( formatAsset( relatedAssets[j], node ) );
                }
            }

            if (!node.children.length) {
                return;
            }

            for (var i = 0; i < node.children.length; i++) {
                fillChildren( node.children[i], tree, relatedAssets, rootId );
            }

        }
    }

})();
