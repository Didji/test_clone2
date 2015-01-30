(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Relationship', RelationshipFactory );

    RelationshipFactory.$inject = ["G3ME", "Marker", "SQLite", "$rootScope", "Smartgeo", "$http", "Site", "GPS"];


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

        Relationship.findChildren = function(id, callback) {
            SQLite.exec( 'parameters', 'SELECT * FROM relationship WHERE daddy = ? ', [id], function(rows) {
                var response = [];
                for (var i = 0; i < rows.length; i++) {
                    response.push( rows.item( i ).child );
                }
                callback( response );
            } );
        };

        Relationship.findRelatives = function(id, callback) {
            SQLite.exec( 'parameters', 'SELECT * FROM relationship WHERE daddy = ? or child = ?', [id, id], function(rows) {
                var response = {
                    daddy: [],
                    child: []
                };
                for (var i = 0; i < rows.length; i++) {
                    if (rows.item( i ).child === id) {
                        response.daddy.push( rows.item( i ).daddy );
                    } else {
                        response.child.push( rows.item( i ).child );
                    }
                }
                callback( response );
            } );
        };

        Relationship.findRoot = function(id, callback) {
            SQLite.exec( 'parameters', 'SELECT * FROM relationship WHERE child = ? ', [id], function(rows) {
                if (rows.length === 0) {
                    callback( id );
                } else {
                    Relationship.findRoot( rows.item( 0 ).daddy, callback );
                }
            } );
        };


        return Relationship;
    }

})();

