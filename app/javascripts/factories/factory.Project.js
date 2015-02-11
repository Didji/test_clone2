(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Project', ProjectFactory );

    ProjectFactory.$inject = ["$http", "$rootScope", "G3ME", "SQLite", "Smartgeo", "AssetFactory", "Asset", "i18n", "Relationship"];


    function ProjectFactory($http, $rootScope, G3ME, SQLite, Smartgeo, AssetFactory, Asset, i18n, Relationship) {

        /**
         * @class ProjectFactory
         * @desc Factory de la classe Project
         */

        function Project(project) {
            angular.extend( this, project );
        }

        Project.prototype.id = undefined ;
        Project.prototype.assets = [] ;
        Project.prototype.added = [] ;
        Project.prototype.deleted = [] ;
        Project.prototype.updated = [] ;
        Project.prototype.bilan = undefined ;
        Project.prototype.estimated_end_date = undefined;
        Project.prototype.last_update_date = undefined;
        Project.prototype.name = undefined;
        Project.prototype.project_manager = undefined;
        Project.prototype.status = undefined;
        Project.prototype.template = undefined;
        Project.prototype.updatable = undefined;
        Project.prototype.url = undefined;
        Project.prototype.loaded = false;
        Project.prototype.loading = false;
        Project.prototype.unloading = false;
        Project.prototype.synchronizing = false;

        Project.database = "parameters" ;
        Project.table = "PROJECTS" ;
        Project.columns = ['id', 'json', 'added', 'deleted', 'updated', 'loaded'];
        Project.prepareStatement = ' ?, ?, ?, ?, ?, ?';
        Project.currentLoadedProject = undefined ;

        /**
         * @name load
         * @desc Télécharge et charge un projet depuis le serveur
         */
        Project.prototype.load = function(callback) {
            var project = this ;
            if (Project.currentLoadedProject && Project.currentLoadedProject.id !== this.id) {
                return Project.currentLoadedProject.unload( function() {
                    project.load( callback );
                } );
            }
            this.loading = true ;
            $http.get( Smartgeo.getServiceUrl( 'project.mobility.load.json', {
                id: this.id
            } ) ).success( function(data) {
                project.setAssets( data.assets, data.relations );
                project.setProjectLoaded( callback );
            } ).error( Project.smartgeoReachError ).finally( function() {
                project.loading = false ;
            } );
        };

        /**
         * @name unload
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Project.prototype.unload = function(callback) {
            var project = this ;
            if (this.hasBeenModified()) {
                return alertify.alert( i18n.get( '_PROJECTS_LOADED_PROJECT_NOT_SAVE_' ) );
            }
            this.unloading = true ;
            $http.get( Smartgeo.getServiceUrl( 'project.mobility.unload.json', {
                id: this.id
            } ) ).success( function() {
                project.setProjectUnloaded( callback );
            } ).error( Project.smartgeoReachError ).finally( function() {
                project.unloading = false ;
            } );
        };

        /**
         * @name unload
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Project.prototype.synchronize = function(callback) {
            var project = this ;
            this.synchronizing = true ;
            $http.get( Smartgeo.getServiceUrl( 'project.mobility.save.json', {
                project: this.id
            }, [ /* [{Asset}] */ ] ) ).success( function() {
                project.discardChanges( callback );
            } ).error( Project.smartgeoReachError ).finally( function() {
                project.synchronizing = false ;
            } );
        };

        /**
         * @name setProjectLoaded
         * @desc
         */
        Project.prototype.setProjectLoaded = function(callback) {
            this.loaded = true ;
            this.loading = false ;
            Project.save( this, callback );
            Project.currentLoadedProject = this ;
            $rootScope.$broadcast( 'NEW_PROJECT_LOADED' );
            G3ME.__updateMapLayers();
        };

        /**
         * @name setProjectUnloaded
         * @desc
         */
        Project.prototype.setProjectUnloaded = function(callback) {
            var project = this ;
            this.loaded = false ;
            this.unloading = false ;
            Asset.delete( this.assets.concat( this.added ), function() {
                Project.save( project, callback );
                Project.currentLoadedProject = null ;
                G3ME.__updateMapLayers();
            } );
        };

        /**
         * @name hasBeenModified
         * @desc
         */
        Project.prototype.hasBeenModified = function() {
            return (this.added.length + this.deleted.length + this.updated.length) > 0;
        };

        Project.smartgeoReachError = function() {
            alertify.alert( i18n.get( '_PROJECTS_CANNOT_REACH_SMARTGEO_' ) );
        };

        /**
         * @name setAssets
         * @desc
         */
        Project.prototype.setAssets = function(assets, relations) {
            if (relations && relations.length) {
                Relationship.saveRelationship( relations );
            }
            this.assets = [];
            for (var i = 0; i < assets.length; i++) {
                this.assets.push( assets[i].guid );
                assets[i].okey = "PROJECT_" + assets[i].okey;
            }
            Asset.delete( this.assets, function() {
                AssetFactory.save( assets );
            } );
            this.save();
        };

        /**
         * @name discardChanges
         * @desc
         */
        Project.prototype.discardChanges = function(callback) {
            var project = this ;
            this.added = [];
            this.updated = [];
            this.deleted = [];
            Asset.delete( this.added, function() {
                project.unload( callback );
            } );
        };

        /**
         * @name addAsset
         * @desc
         */
        Project.prototype.addAsset = function(asset, callback) {
            if (this.added.indexOf( +asset.id ) === -1) {
                this.added.push( +asset.id );
                this.save( callback );
            }
        };

        /**
         * @name addAssets
         * @desc
         */
        Project.prototype.addAssets = function(assets, callback) {
            for (var i = 0; i < assets.length; i++) {
                this.addAsset( assets[i], (i === assets.length - 1) ? callback : undefined );
            }
        };

        /**
         * @name setAssets
         * @desc
         */
        Project.prototype.consult = function() {
            Asset.findAssetsByGuids( this.assets, function(assets) {
                $rootScope.$broadcast( "UPDATE_CONSULTATION_ASSETS_LIST", assets );
            } );
        };

        /**
         * @name serializeForSQL
         * @desc Serialize les attributs du projet pour la requête SQL
         */
        Project.prototype.serializeForSQL = function() {
            return [this.id, JSON.stringify( this ), JSON.stringify( this.added ), JSON.stringify( this.deleted ), JSON.stringify( this.updated ), this.loaded];
        };

        /**
         * @name getLoadedProject
         * @desc Enregistre un projet en base de données
         */
        Project.getLoadedProject = function(callback) {
            SQLite.exec( Project.database, 'SELECT * FROM ' + Project.table + ' WHERE loaded = ? ', ["true"], function(rows) {
                (callback || function() {})( rows.length ? new Project( Project.convertRawRow( rows.item( 0 ) ) ) : false );
            } );
        };

        /**
         * @name save
         * @desc Enregistre un projet en base de données
         */
        Project.save = function(project, callback) {
            if (!(project instanceof Project)) {
                project = new Project( project );
            }
            return project.save( callback );
        };

        /**
         * @name save
         * @desc Enregistre un projet en base de données
         */
        Project.prototype.save = function(callback) {
            SQLite.exec( Project.database, 'INSERT OR REPLACE INTO ' + Project.table + '(' + Project.columns.join( ',' ) + ') VALUES (' + Project.prepareStatement + ')', this.serializeForSQL(), callback );
            return this;
        };

        /**
         * @name find
         * @desc Requête la base de données locales pour trouver un projet à partir d'un identifiant
         */
        Project.find = function(id, callback) {
            SQLite.exec( Project.database, 'SELECT * FROM ' + Project.table + ' WHERE id = ? ', [id], function(rows) {
                (callback || function() {})( rows.length ? new Project( Project.convertRawRow( rows.item( 0 ) ) ) : false );
            } );
        };

        /**
         * @name findAll
         * @desc Requête la base de données locales pour trouver tous les projets
         */
        Project.findAll = function(callback) {
            SQLite.exec( Project.database, 'SELECT * FROM ' + Project.table, [], function(rows) {
                var projects = [];
                for (var i = 0; i < rows.length; i++) {
                    projects.push( new Project( Project.convertRawRow( rows.item( i ) ) ) );
                }
                (callback || function() {})( projects );
            } );
        };

        /**
         * @name list
         * @desc Requête le serveur pour récupérer les projets de l'utilisateur connecté.
         */
        Project.list = function() {
            return $http.get( Smartgeo.getServiceUrl( 'project.mobility.list.json' ) );
        };


        /**
         * @name convertRawRow
         * @desc Converti un projet brute, de la base de données en projet utilisable par l'application
         */
        Project.convertRawRow = function(p) {
            return angular.extend( {
                id: p.id,
                loaded: p.loaded,
                added: JSON.parse( p.added ),
                deleted: JSON.parse( p.deleted ),
                updated: JSON.parse( p.updated )
            }, JSON.parse( p.json ) );
        };

        SQLite.exec( Project.database, 'CREATE TABLE IF NOT EXISTS ' + Project.table + '(' + Project.columns.join( ',' ).replace( 'id', 'id unique' ) + ')' );

        return Project;
    }

})();
