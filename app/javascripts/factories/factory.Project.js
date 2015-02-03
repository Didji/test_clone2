(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Project', ProjectFactory );

    ProjectFactory.$inject = ["$http", "SQLite", "Smartgeo"];


    function ProjectFactory($http, SQLite, Smartgeo) {

        /**
         * @class ProjectFactory
         * @desc Factory de la classe Project
         */

        function Project(project) {
            angular.extend( this, project );
        }

        Project.prototype.id = undefined ;
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

        Project.database = "parameters" ;
        Project.table = "PROJECTS" ;
        Project.columns = ['id', 'json', 'added', 'deleted', 'updated', 'loaded'];
        Project.prepareStatement = ' ?, ?, ?, ?, ?, ?';

        /**
         * @name load
         * @desc Télécharge et charge un projet depuis le serveur
         */
        Project.prototype.load = function() {
            return $http.get( Smartgeo.getServiceUrl( 'project.mobility.load.json' ) );
        };

        /**
         * @name unload
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Project.prototype.unload = function() {
            return $http.get( Smartgeo.getServiceUrl( 'project.mobility.unload.json' ) );
        };

        /**
         * @name serializeForSQL
         * @desc Serialize les attributs du projet pour la requête SQL
         */
        Project.prototype.serializeForSQL = function() {
            return [this.id, JSON.stringify( this ), JSON.stringify( this.added ), JSON.stringify( this.deleted ), JSON.stringify( this.updated ), this.loaded];
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
            SQLite.exec( Project.database, 'INSERT OR REPLACE INTO ' + Project.table + '(' + Project.columns.join( ',' ) + ') VALUES (' + Project.prepareStatement + ')', project.serializeForSQL(), callback );
            return project;
        };

        /**
         * @name find
         * @desc Requête la base de données locales pour trouver un projet à partir d'un identifiant
         */
        Project.find = function(id, callback) {
            SQLite.exec( Project.database, 'SELECT * FROM ' + Project.table + ' WHERE id = ? ', [id], function(rows) {
                callback( rows.length ? new Project( rows.item( 0 ) ) : false );
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
