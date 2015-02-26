(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Relationship', RelationshipFactory );

    RelationshipFactory.$inject = ["G3ME", "Marker", "SQLite"];


    function RelationshipFactory(G3ME, Marker, SQLite) {

        /**
         * @class RelationshipFactory
         * @desc Factory de la classe Relationship
         */
        var Relationship = {};

        /**
         * @name findRelated
         * @desc
         * @param {Number} id
         * @param {Function} callback
         */
        Relationship.findRelated = function(id, callback) {
            Relationship.findRoot( id, function(root) {
                Relationship.findSubtree( root, callback );
            } );
        };

        /**
         * @name findSubtree
         * @desc
         * @param {Map} root
         * @param {Function} callback
         */
        Relationship.findSubtree = function(root, callback) {

            var tree = {};

            tree[root] = null;

            findSubtree_rec();

            function findSubtree_rec() {
                for (var id in tree) {
                    if (tree[id] === null) {
                        return Relationship.findChildren( +id, function(children) {
                            tree[id] = children;
                            for (var i = 0; i < children.length; i++) {
                                tree[children[i]] = null;
                            }
                            findSubtree_rec();
                        } );
                    }
                }
                callback( root, tree );
            }
        };

        /**
         * @name findChildren
         * @desc
         * @param {Number} id
         * @param {Function} callback
         */
        Relationship.findChildren = function(id, callback) {
            SQLite.exec( 'parameters', 'SELECT * FROM relationship WHERE daddy = ? ', [id], function(rows) {
                var response = [];
                for (var i = 0; i < rows.length; i++) {
                    response.push( rows.item( i ).child );
                }
                callback( response );
            } );
        };

        /**
         * @name findRoot
         * @desc
         * @param {Number} id
         * @param {Function} callback
         */
        Relationship.findRoot = function(id, callback) {
            SQLite.exec( 'parameters', 'SELECT * FROM relationship WHERE child = ? ', [id], function(rows) {
                if (rows.length === 0) {
                    callback( id );
                } else {
                    Relationship.findRoot( rows.item( 0 ).daddy, callback );
                }
            } );
        };

        /**
         * @name delete
         * @desc
         * @param {Number|Array{Number}} ids
         * @param {Function} callback
         */
        Relationship.delete = function(ids, callback) {
            ids = ((+ids === ids) ? [ids] : ids) || [];
            if (!ids.length) {
                return callback();
            }
            ids = ids.join( ',' );
            SQLite.exec( 'parameters', 'DELETE FROM relationship WHERE child in (' + ids + ') or daddy in (' + ids + ')', [], callback );
        };

        /**
         * @name save
         * @desc
         * @param {Map} relationship
         * @param {Function} TODO:callback
         */
        Relationship.save = function(relationship /*, callback*/ ) {
            SQLite.openDatabase( {
                name: 'parameters'
            } ).transaction( function(transaction) {
                for (var daddy in relationship) {
                    for (var child in relationship[daddy]) {
                        transaction.executeSql( 'INSERT INTO relationship VALUES (' + (+daddy) + ', ' + (+relationship[daddy][child]) + ');' );
                    }
                }
            } );
        };

        /**
         * @name getRelationshipsFromComplexAsset
         * @desc
         * @param {ComplexAsset} complex
         */
        Relationship.getRelationshipsFromComplexAsset = function(complex) {
            var tree = {} ;
            Relationship.getRelationshipsFromComplexAssetSubtree( complex, tree );
            return tree;
        };

        /**
         * @name getRelationshipsFromComplexAssetSubtree
         * @desc
         * @param {ComplexAsset} complex
         * @param {Map{Number->Array{Number}}} tree
         */
        Relationship.getRelationshipsFromComplexAssetSubtree = function(complex, tree) {
            tree[complex.id || complex.uuid] = tree[complex.id || complex.uuid] || [] ;
            for (var i = 0; i < complex.children.length; i++) {
                tree[complex.id || complex.uuid].push( complex.children[i].id || complex.children[i].uuid );
                Relationship.getRelationshipsFromComplexAssetSubtree( complex.children[i], tree );
            }
        };

        return Relationship;
    }

})();

