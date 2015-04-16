(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'ComplexAsset', ComplexAssetFactory );

    ComplexAssetFactory.$inject = ["$q", "$rootScope", "$http", "G3ME", "Storage", "Site", "Asset", "Relationship", "SQLite", "Synchronizator", "i18n"];

    function ComplexAssetFactory($q, $rootScope, $http, G3ME, Storage, Site, Asset, Relationship, SQLite, Synchronizator, i18n) {

        /**
         * @class ComplexAssetFactory
         * @desc Factory de la classe ComplexAsset
         */
        function ComplexAsset(okey, father, root, asset) {
            asset = asset || {
                id: null,
                okey: null,
                guid: null,
                children: [],
                relatedAssets: {},
                geometry: null,
                fields: {}

            };
            if (asset.id !== null) {
                this.id = asset.id;
            }
            this.okey = okey || asset.okey;
            this.isProject = (this.okey !== null) ? (this.okey.search( /PROJECT_/ ) === 0) : false;
            this.uuid = window.uuid() || null;
            this.children = asset.children || [];
            this.father = father && father.uuid;
            this.root = root || this;
            this.fields = asset.attributes || {};
            this.tree = {};
            this.relatedAssets = asset.relatedAssets || {};
            if (this.okey) {
                this.fields[Site.current.metamodel[this.okey].ukey] = Site.current.metamodel[this.okey].label;
            }
            this.guid = asset.id || null;
            this.geometry = asset.geometry || null;

            if (!this.okey) {
                console.error( 'You must provide a root okey.' );
                return false;
            }

            if (Site.current.dependancies[okey]) {
                this.add();
            }

            return this;
        }

        /**
         * @name add
         * @desc        Ajoute un noeud à l'uuid renseigné
         * @returns     {ComplexAsset} Objet complexe créé
         */
        ComplexAsset.prototype.add = function() {

            var childType = Site.current.dependancies[this.okey];

            if (!childType) {
                console.error( 'This node type has no child type.' );
                return false;
            } else {
                return this.children.push( new ComplexAsset( childType, this, this.root ) );
            }

        };


        /**
         * @name get
         * @desc        Cherche le noeud correspondant à l'UUID en paramêtre
         * @param       {string} uuid
         * @returns     {ComplexAsset} Objet correspondant à l'UUID
         */
        ComplexAsset.prototype.get = function(uuid) {

            if (!uuid) {
                console.error( 'You must provide node uuid.' );
                return false;
            }
            if (this.uuid === uuid) {
                return this;
            }

            var found = false;

            for (var i = 0; i < this.children.length; i++) {
                found = found || this.children[i].get( uuid );
            }

            if (!this.father && !found) {
                console.error( 'Uuid ' + this.uuid + ' not found.' );
                return false;
            } else {
                return found;
            }

        };

        /**
         * @name duplicate
         * @desc
         * @returns {ComplexAsset} Objet complexe créé
         */
        ComplexAsset.prototype.duplicate = function() {

            if (!this.father) {
                console.error( 'You cannot duplicate root node.' );
                return false;
            }

            var father = this.root.get( this.father );

            if (!father) {
                console.error( 'Father node ' + this.father + ' not found.' );
                return false;
            }

            for (var i = 0; i < father.children.length; i++) {
                if (father.children[i].uuid === this.uuid) {
                    var newNode = father.children[i].__clone();
                    newNode.__updateUuid( father.uuid );
                    newNode.__closeTreeForm();
                    father.children.push( newNode );
                    return newNode;
                }
            }

        };


        /**
         * @name delete
         * @desc
         * @param {string} uuid
         * @returns {Boolean} True si l'objet a été supprimé
         */
        ComplexAsset.prototype.delete = function() {

            if (!this.father) {
                console.error( 'You cannot remove root node.' );
                return false;
            }

            var father = this.root.get( this.father );

            if (!father) {
                console.error( 'Father node ' + this.father + ' not found.' );
                return false;
            }

            for (var i = 0; i < father.children.length; i++) {
                if (father.children[i].uuid === this.uuid) {
                    if (father.children[i].layer) {
                        father.children[i].layer._map.removeLayer( father.children[i].layer );
                        delete father.children[i].layer;
                    }
                    delete father.children[i];
                    father.children.splice( i, 1 );
                    return true;
                }
            }
            return false;
        };

        /**
         * @name toggleForm
         * @desc
         */
        ComplexAsset.prototype.toggleForm = function() {
            var visibility = this.formVisible;
            this.root.__closeTreeForm();
            this.formVisible = !visibility;
        };

        /**
         * @name getLabel
         * @desc
         */
        ComplexAsset.prototype.getLabel = function() {
            return this.isProject ? i18n.get( "_MENU_PROJECT" ) : i18n.get( "_MENU_CENSUS" );
        };

        /**
         * @name getDescription
         * @desc
         */
        ComplexAsset.prototype.getDescription = function() {
            return Site.current.metamodel[this.okey].label;
        };

        /**
         * @name __closeTreeForm
         * @desc
         */
        ComplexAsset.prototype.__closeTreeForm = function() {
            this.formVisible = false;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__closeTreeForm();
            }
        };

        /**
         * @name formatComplexToSimple
         * @desc
         */
        ComplexAsset.formatComplexToSimple = function(complex, Project, update) {
            var assets = complex.gimmeYourLinearSubtree(), asset , i  ;
            var masterGeom = null ;
            var masterBounds = null ;
            for (i = 0; i < assets.length; i++) {
                asset = assets[i] ;
                asset.guid = update ? asset.guid : asset.uuid ;
                asset.attributes = asset.fields ;
                asset.classindex = (Project && Project.currentLoadedProject && Project.currentLoadedProject.getClassIndexForAddedAsset( asset.okey ));
                asset.geometry = asset.geometry && ComplexAsset.getGeometryFromCensusAsset( asset );
                asset.bounds = asset.geometry && ComplexAsset.getBoundsFromCensusAsset( asset );
                asset.maplabel = "";
                delete asset.father;
                delete asset.fields;
                delete asset.formVisible;
                delete asset.isProject;
                delete asset.layer;
                delete asset.uuid;
                delete asset.root;
                masterGeom = masterGeom || asset.geometry;
                masterBounds = masterBounds || asset.bounds;
            }
            for (i = 0; i < assets.length; i++) {
                if (!assets[i].geometry) {
                    assets[i].geometry = masterGeom ;
                    assets[i].bounds = masterBounds ;
                    assets[i].classindex = 0 ;
                }
            }
            return assets;
        };

        /**
         * @name getGeometryFromCensusAsset
         * @desc
         */
        ComplexAsset.getGeometryFromCensusAsset = function(complex) {
            var type ;
            if (complex.geometry.coordinates) {
                if (complex.geometry.coordinates.length === 2 && typeof complex.geometry.coordinates[0] === "number") {
                    type = "Point";
                    complex.geometry = [complex.geometry.coordinates[0], complex.geometry.coordinates[1]];
                } else {
                    type = "LineString";
                }
            } else {
                if (complex.geometry.length === 2 && typeof complex.geometry[0] === "number") {
                    type = "Point";
                    complex.geometry = [complex.geometry[1], complex.geometry[0]];
                } else {
                    type = "LineString";
                }
            }
            return {
                type: type,
                coordinates: complex.geometry
            };
        };

        /**
         * @name getBoundsFromCensusAsset
         * @desc
         */
        ComplexAsset.getBoundsFromCensusAsset = function(complex) {
            if (complex.geometry.type === "Point") {
                return {
                    sw: {
                        lng: complex.geometry.coordinates[0],
                        lat: complex.geometry.coordinates[1]
                    },
                    ne: {
                        lng: complex.geometry.coordinates[0],
                        lat: complex.geometry.coordinates[1]
                    }
                };
            } else {
                // TODO : GERER LES LINESTRING
                return false;
            }
        };


        /**
         * @name gimmeYourLinearSubtree
         * @desc
         */
        ComplexAsset.prototype.gimmeYourLinearSubtree = function() {
            var linearMe = angular.copy( this.__clean() );
            delete linearMe.children;
            var linearSubtree = [linearMe];
            for (var i = 0; i < this.children.length; i++) {
                linearSubtree = linearSubtree.concat( this.children[i].gimmeYourLinearSubtree() );
            }
            return linearSubtree;
        };


        /**
         * @name save
         * @desc
         */
        ComplexAsset.prototype.save = function(Project, update) {

            var node = this.__clone( true ),
                prefix = node.okey.search( /PROJECT_/ ) === 0 ? "project_" : "",
                method = prefix + (update ? "update" : "new");

            node.timestamp = node.timestamp = Date.now();

            var assets = node.convertToTempLinearAndSave( update, Project );

            node.uuids = [];

            for (var i = 0; i < assets.length; i++) {
                node.uuids.push( assets[i].uuid || assets[i].guid );
            }

            if (node.isProject && !update) {
                Project.currentLoadedProject.addNew( assets );
            } else if (node.isProject && update) {
                Project.currentLoadedProject.addUpdated( assets );
            }

            Synchronizator.add( method, node.__clean() );

        };

        /**
         * @name convertToTempLinearAndSave
         * @desc
         */
        ComplexAsset.prototype.convertToTempLinearAndSave = function(update, Project) {
            var relationships = Relationship.getRelationshipsFromComplexAsset( this ),
                assets = ComplexAsset.formatComplexToSimple( this, Project, update ),
                method = update ? "update" : "save" ;

            Asset[method]( assets, function() {
                if (!update) {
                    Relationship.save( relationships, G3ME.reloadLayers );
                } else {
                    $rootScope.$broadcast( "REFRESH_CONSULTATION" );
                }
            } );

            return assets;
        };

        /**
         * @name __log
         * @desc
         */
        ComplexAsset.prototype.__log = function() {
            console.groupCollapsed( Site.current.metamodel[this.okey].label + ':' + this.uuid );
            console.info( this );
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__log();
            }
            console.groupEnd();
        };

        /**
         * @name __clone
         * @desc
         * @param {boolean} preserveGeometry
         */
        ComplexAsset.prototype.__clone = function(preserveGeometry) {
            var root = this.root,
                layer = this.layer,
                geometry = this.geometry;

            if (!preserveGeometry) {
                this.__deleteGeometry();
            }
            this.__deleteLayer();
            this.__deleteRoot();

            var newNode = angular.copy( this );

            if (!preserveGeometry) {
                this.__restoreGeometry( geometry );
            }
            this.__restoreRoot( root );
            this.__restoreLayer( layer );

            newNode.__restoreRoot( root );
            return newNode;
        };

        /**
         * @name __deleteRoot
         * @desc
         */
        ComplexAsset.prototype.__deleteRoot = function() {
            delete this.root;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__deleteRoot();
            }
        };

        /**
         * @name __deleteGeometry
         * @desc
         */
        ComplexAsset.prototype.__deleteGeometry = function() {
            delete this.geometry;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__deleteGeometry();
            }
        };

        /**
         * @name __deleteLayer
         * @desc
         */
        ComplexAsset.prototype.__deleteLayer = function() {
            delete this.layer;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__deleteLayer();
            }
        };

        /**
         * @name __restoreGeometry
         * @desc
         * @param {*} geometry
         */
        ComplexAsset.prototype.__restoreGeometry = function(geometry) {
            this.geometry = geometry;
        };

        /**
         * @name __restoreLayer
         * @desc
         * @param {*} layer
         */
        ComplexAsset.prototype.__restoreLayer = function(layer) {
            this.layer = layer;
        };

        /**
         * @name __restoreRoot
         * @desc
         * @param {ComplexAsset} root
         */
        ComplexAsset.prototype.__restoreRoot = function(root) {
            this.root = root;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__restoreRoot( root );
            }
        };

        /**
         * @name __clean
         * @desc
         */
        ComplexAsset.prototype.__clean = function() {
            this.__deleteRoot();
            delete this.father;
            delete this.showForm;
            delete this.layer;
            delete this.formVisible;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__clean();
            }
            return this;
        };

        /**
         * @name __updateUuid
         * @desc
         */
        ComplexAsset.prototype.__updateUuid = function(father) {
            this.uuid = window.uuid();
            this.father = father;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__updateUuid( this.uuid );
            }
        };

        /**
         * @name isFieldOk
         * @desc
         */
        ComplexAsset.prototype.isFieldOk = function() {
            for (var i = 0, ii = this.children.length; i < ii; i++) {
                if (!this.children[i].isFieldOk()) {
                    return false;
                }
            }
            for (var j = 0, jj = Site.current.metamodel[this.okey].tabs.length; j < jj; j++) {
                var tab = Site.current.metamodel[this.okey].tabs[j] ;
                for (var k = 0, kk = tab.fields.length; k < kk; k++) {
                    var field = tab.fields[k] ;
                    if (field.required && (!this.fields[field.key] || !this.fields[field.key])) {
                        return false;
                    }
                }
            }
            return true;
        };

        /**
         * @name isGeometryOk
         * @desc
         */
        ComplexAsset.prototype.isGeometryOk = function() {
            if (Site.current.metamodel[this.okey].is_graphical && !this.geometry) {
                return false;
            } else if (!this.children.length) {
                return true;
            }

            var children = true;
            for (var i = 0; i < this.children.length; i++) {
                children = children && this.children[i].isGeometryOk();
            }
            return children;
        };

        /**
         * @name find
         * @desc
         */
        ComplexAsset.find = function(id, callback) {
            id = id.length !== undefined ? id : [id];
            if (!id.length) {
                return callback( [] );
            }
            SQLite.exec( ComplexAsset.database, 'SELECT * FROM ' + ComplexAsset.table + ' WHERE id in (' + id.join( ',' ) + ')', [], function(rows) {
                var complexes = [], complex;
                for (var i = 0; i < rows.length; i++) {
                    complex = angular.extend( rows.item( i ), JSON.parse( rows.item( i ).json ) );

                    complexes.push( complex );
                }
                (callback || function() {})( complexes );
            } );
        };

        /**
         * @name serializeForSQL
         * @desc Serialize les attributs de l'object complexe pour la requête SQL
         */
        ComplexAsset.prototype.serializeForSQL = function() {
            return [this.uuid || this.guid || this.id, JSON.stringify( this.__clean( true ) ), this.okey.search( /PROJECT_/ ) === 0];
        };

        return ComplexAsset;

    }

})();
