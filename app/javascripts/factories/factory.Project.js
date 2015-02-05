(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Project', ProjectFactory );

    ProjectFactory.$inject = ["$http", "$rootScope", "G3ME", "SQLite", "Smartgeo", "AssetFactory", "Asset", "i18n"];


    function ProjectFactory($http, $rootScope, G3ME, SQLite, Smartgeo, AssetFactory, Asset, i18n) {

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
        Project.prototype.loaded = undefined;
        Project.prototype.loading = undefined;
        Project.prototype.unloading = undefined;

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
            callback = callback || function() {};
            Project.getLoadedProject( function(loadedProject) {
                if (loadedProject && loadedProject.id !== project.id) {
                    return loadedProject.unload( function() {
                        project.load( callback );
                    } );
                }
                project.loading = true ;
                $http.get( Smartgeo.getServiceUrl( 'project.mobility.load.json', {
                    id: project.id
                } ) ).success( function(assets) {
                    project.setAssets( assets );
                    project.loading = false ;
                    project.loaded = true ;
                    Project.save( project, callback );
                    Project.currentLoadedProject = project ;
                    $rootScope.$broadcast( 'NEW_PROJECT_LOADED' );
                    G3ME.__updateMapLayers();
                } ).error( function() {
                    project.loading = false ;
                } );
            } );
        };

        /**
         * @name unload
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Project.prototype.unload = function(callback) {
            var project = this ;
            if ((project.added.length + project.deleted.length + project.updated.length) > 0) {
                return alertify.alert( i18n.get( '_PROJECTS_LOADED_PROJECT_NOT_SAVE_' ) );
            }
            this.unloading = true ;
            callback = callback || function() {};
            $http.get( Smartgeo.getServiceUrl( 'project.mobility.unload.json', {
                id: project.id
            } ) ).success( function() {
                project.unloading = false ;
                project.loaded = false ;
                Asset.delete( project.assets.concat( project.added ), function() {
                    Project.save( project, callback );
                    Project.currentLoadedProject = null ;
                    G3ME.__updateMapLayers();
                } );
            } ).error( function() {
                project.unloading = false ;
            } );
        };

        /**
         * @name setAssets
         * @desc
         */
        Project.prototype.setAssets = function(assets) {
            this.assets = [];
            for (var i = 0; i < assets.length; i++) {
                this.assets.push( assets[i].guid );
            }
            Asset.delete( this.assets, function() {
                AssetFactory.save( assets );
            } );
            this.save();
        };

        /**
         * @name addAsset
         * @desc
         */
        Project.prototype.addAsset = function(asset) {
            if (this.assets.indexOf( asset.id ) === -1) {
                this.assets.push( asset.id );
                this.added.push( asset.id );
                this.save();
            }
        };

        /**
         * @name addAssets
         * @desc
         */
        Project.prototype.addAssets = function(assets) {
            for (var i = 0; i < assets.length; i++) {
                this.addAsset( assets[i] );
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
                callback( rows.length ? new Project( Project.convertRawRow( rows.item( 0 ) ) ) : false );
            } );
        };

        /**
         * @name save
         * @desc Enregistre un projet en base de données
         */
        Project.save = function(project, callback) {
            callback = callback || function() {};
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
            callback = callback || function() {};
            SQLite.exec( Project.database, 'INSERT OR REPLACE INTO ' + Project.table + '(' + Project.columns.join( ',' ) + ') VALUES (' + Project.prepareStatement + ')', this.serializeForSQL(), callback );
            return this;
        };

        /**
         * @name find
         * @desc Requête la base de données locales pour trouver un projet à partir d'un identifiant
         */
        Project.find = function(id, callback) {
            SQLite.exec( Project.database, 'SELECT * FROM ' + Project.table + ' WHERE id = ? ', [id], function(rows) {
                callback( rows.length ? new Project( Project.convertRawRow( rows.item( 0 ) ) ) : false );
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
                callback( projects );
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
