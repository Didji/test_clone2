(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Project', ProjectFactory );

    ProjectFactory.$inject = ["Site", "$http", "$rootScope", "G3ME", "SQLite", "Asset", "i18n", "Relationship", "ComplexAsset", "Utils", "Synchronizator", "Marker"];


    function ProjectFactory(Site, $http, $rootScope, G3ME, SQLite, Asset, i18n, Relationship, ComplexAsset, Utils, Synchronizator, Marker) {

        /**
         * @class ProjectFactory
         * @desc Factory de la classe Project
         */

        function Project(project) {
            angular.extend( this, project );
        }

        Project.prototype.id = undefined ;
        Project.prototype.assets = [] ;
        Project.prototype.new = [] ; // Créés dans le projet
        Project.prototype.deleted = [] ; // Supprimés dans le projet
        Project.prototype.updated = [] ; // Modifiés dans le projet
        Project.prototype.added = [] ; // Ajoutés au projet
        Project.prototype.removed = [] ; // Retirés du projet
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
        Project.prototype.is_open = false;
        Project.prototype.listAssetShow = [];

        Project.database = "parameters" ;
        Project.table = "PROJECTS" ;
        Project.columns = ['id', 'json', 'added', 'deleted', 'updated', 'new', 'loaded'];
        Project.prepareStatement = Project.columns.join( ',' ).replace( /[a-z]+/gi, '?' );
        Project.currentLoadedProject = undefined ;

        /**
         * @name load
         * @desc Télécharge et charge un projet depuis le serveur
         */
        Project.prototype.load = function(callback) {
            if (this.loaded) {
                return this.setProjectLoaded( callback );
            }
            var project = this ;
            if (Project.currentLoadedProject && Project.currentLoadedProject.id !== this.id) {
                return Project.currentLoadedProject.unload( function() {
                    project.load( callback );
                } );
            }
            this.loading = true ;
            $http.get( Utils.getServiceUrl( 'project.mobility.load.json', {
                id: this.id
            } ) ).success( function(data) {
                if (data.assets != 0) {
                    project.setMarkersProject(data.assets, data.relations);
                }

                project.setAssets( data.assets, data.relations, function() {
                    project.setProjectLoaded( callback );
                } );
            } ).error( function(data, status) {
                project.handleLoadError( data, status );
            } ).finally( function() {
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
            $http.get( Utils.getServiceUrl( 'project.mobility.unload.json', {
                id: this.id
            } ) ).success( function() {
                project.unSetMarkersProject();
                project.setProjectUnloaded( callback );
                Project.checkRemoteLockedAssets();
            } ).error( Project.smartgeoReachError ).finally( function() {
                project.unloading = false ;
            } );
        };

        /**
         * @name synchronize
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Project.prototype.synchronize = function(callback) {
            var project = this;
            this.synchronizing = true;
            this.getSynchronizePayload( function(payload) {
                $http.put( Utils.getServiceUrl( 'project.mobility.save.json', {
                    id_project: project.id
                } ), payload ).success( function() {
                    project.discardChanges( callback );
                } ).error( Project.handleSynchronizeError ).finally( function() {
                    project.synchronizing = false ;
                } );
            } );
        };

        /**
         * @name getSynchronizePayload
         * @desc Construit la payload pour le service d'enregistrement
         */
        Project.prototype.getSynchronizePayload = function(callback) {
            var payload = {
                    'added': {},
                    'removed': {},
                    'deleted': [],
                    'new': [],
                    'updated': []
                },
                project = this ;
            Synchronizator.getAll( 'ComplexAsset', 'project_new', function(newAssets) {
                payload.new = newAssets;
                Synchronizator.getAll( 'ComplexAsset', 'project_update', function(updatedAssets) {
                    payload.updated = updatedAssets;
                    Asset.findAssetsByGuids( project.added.concat( project.removed.concat( project.deleted ) ), function(assets) {
                        for (var i = 0; i < assets.length; i++) {
                            if (project.added.indexOf( assets[i].id ) !== -1) {
                                payload.added[assets[i].okey] = payload.added[assets[i].okey] || [];
                                payload.added[assets[i].okey].push( assets[i].attributes._original );
                            } else if (project.removed.indexOf( assets[i].guid ) !== -1) {
                                payload.removed[assets[i].okey] = payload.removed[assets[i].okey] || [];
                                payload.removed[assets[i].okey].push( assets[i].id );
                            }
                            if (project.deleted.indexOf( assets[i].id ) !== -1) {
                                payload.deleted.push( assets[i] );
                            }
                        }

                        callback( payload );
                    } );
                } );
            } );
        };

        /**
         * @name handleSynchronizeError
         * @desc Gére les erreurs remontées du service d'ajout/relachement d'asset
         */
        Project.handleSynchronizeError = function(data, status) {
            switch (status) {
                case 400:
                    if (data.locked) {
                        var locked = [];
                        Asset.findAssetsByGuids( data.locked, function(assets) {
                            for (var i = 0; i < assets.length; i++) {
                                locked.push( Site.current.metamodel[assets[i].okey].label + " " + assets[i].label );
                            }
                            alertify.alert( i18n.get( '_PROJECT_ASSETS_ARE_LOCKED_', locked.sort().join( ", " ) ) );
                        } );
                    }
                    break;
                default:
                    Project.smartgeoReachError();
                    break;
            }
        };

        /**
         * @name handleLoadError
         * @desc Gére les erreurs remontées du service de chargement de projet
         */
        Project.prototype.handleLoadError = function(data) {
            switch (data.error.code) {
                case 4007:
                    alertify.alert( i18n.get( '_PROJECT_STATUS_DOESNT_ALLOW_UPDATE_' ) );
                    break;
                case 4231:
                    this.updatable = false;
                    alertify.alert( i18n.get( '_PROJECT_IS_LOCKED_BY_ANOTHER_USER_' ) );
                    break;
                default:
                    Project.smartgeoReachError();
                    break;
            }
        };

        /**

         * @name remoteNewUpdateDeleteAssets
         * @desc Synchronise la création, la modification et la suppression d'asset
         */
        Project.prototype.remoteNewUpdateDeleteAssets = function(callback) {
            var project = this ;
            this.getNewUpdateDeletePayload( function(payload) {
                $http.post( Utils.getServiceUrl( 'gi.maintenance.mobility.installation.assets.json', {
                    id_project: project.id
                } ), payload ).success( function() {
                    project.discardChanges( callback );
                } ).error( Project.smartgeoReachError ).finally( function() {
                    project.synchronizing = false ;
                } );
            } );
        };


        /**
         * @name getNewUpdateDeletePayload
         * @desc Construit la payload pour le service de création, modification et suppression d'asset
         */
        Project.prototype.getNewUpdateDeletePayload = function(callback) {
            var payload = {
                    'deleted': [],
                    'new': [],
                    'updated': []
                },
                project = this ;
            ComplexAsset.find( this.new, function(complexes) {
                payload.new = complexes;
                Asset.findAssetsByGuids( project.deleted.concat( project.updated ), function(assets) {
                    for (var i = 0; i < assets.length; i++) {
                        if (project.deleted.indexOf( assets[i].id ) !== -1) {
                            payload.deleted.push( assets[i] );
                        } else if (project.updated.indexOf( assets[i].id ) !== -1) {
                            payload.updated.push( assets[i] );
                        }
                    }
                    callback( payload );
                } );
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
            if (!$rootScope.$$phase) {
                $rootScope.$apply();
            }
            G3ME.reloadLayers();
        };

        /**
         * @name setProjectUnloaded
         * @desc
         */
        Project.prototype.setProjectUnloaded = function(callback) {
            var project = this,
                assets = project.assets;
            this.loaded = false ;
            this.unloading = false ;
            Asset.deleteAllProjectAsset();
            Synchronizator.deleteAllProjectItems();
            $rootScope.$broadcast( 'OLD_PROJECT_UNLOADED' );
            Asset.delete( this.assets, function() {
                Project.save( project, callback );
                Project.currentLoadedProject = null ;
                $rootScope.$broadcast( "_REMOTE_DELETE_ASSETS_", assets );
                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
                G3ME.reloadLayers();
                $rootScope.$broadcast( 'REFRESH_CONSULTATION' );
            } );
        };

        Project.checkRemoteLockedAssets = function() {
            $http.get ( Utils.getServiceUrl('project.mobility.assets.locked') )
                 .success(
                    function(guids) {
                        Asset.lock( guids );
                    }
            );
        };

        /**
         * @name hasBeenModified
         * @desc
         */
        Project.prototype.hasBeenModified = function() {
            return (this.new.length + this.deleted.length + this.updated.length + this.added.length + this.removed.length) > 0;
        };

        Project.prototype.getAssetLength = function() {
            return this.new.length + this.deleted.length + this.updated.length + this.added.length + this.removed.length + this.assets.length;
        };

        Project.smartgeoReachError = function() {
            alertify.alert( i18n.get( '_PROJECTS_CANNOT_REACH_SMARTGEO_' ) );
        };

        /**
         * @name setAssets
         * @desc
         */
        Project.prototype.setAssets = function(assets, relations, callback) {
            if (!assets || !assets.length) {
                return (callback || function() {})();
            }
            var project = this ;
            if (relations) {
                Relationship.save( relations );
            }
            project.assets = [];
            for (var i = 0; i < assets.length; i++) {
                project.assets.push( assets[i].guid );
                assets[i].okey = "PROJECT_" + assets[i].okey;
            }
            Asset.delete( project.assets, function() {
                Asset.save( assets, function() {
                    project.save( callback );
                } );
            } );
        };

        /**
         * @name discardChanges
         * @desc
         */
        Project.prototype.discardChanges = function(callback) {
            var project = this ;
            this.added = [];
            this.removed = [];
            this.new = [];
            this.updated = [];
            this.deleted = [];
            this.assets = [];
            Asset.delete( [], function() {
                project.unload( callback );
            } );
        };

        /**
         * @name addAsset
         * @desc
         */
        Project.prototype.addAsset = function(asset, callback, updateConsultation) {
            var project = this;
            asset.duplicate( function(duplicates, tree) {
                var guids = Object.keys( tree );

                for (var i = 0; i < guids.length; i++) {
                    if (project.removed.indexOf( guids[i] ) !== -1) {
                        project.removed.splice( project.removed.indexOf( guids[i] ), 1 );
                        project.assets.push( guids[i] );
                    } else if (project.added.indexOf( guids[i] ) === -1) {
                        project.added.push( guids[i] );
                    }
                }

                project.save( callback );
                if (updateConsultation) {
                    G3ME.reloadLayers();
                    $rootScope.$broadcast( 'UPDATE_CONSULTATION_ASSETS_LIST', duplicates, false );
                }
            }, project );

            asset.lock();
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
         * @name addNew
         * @desc
         */
        Project.prototype.addNew = function(assets, callback) {
            if (!assets.length) {
                assets = [assets];
            }
            for (var i = 0; i < assets.length; i++) {
                assets[i].project_status = "added";
                this.new.push( assets[i].guid );
                this.assets.push( assets[i].guid );
            }
            this.save( callback );
            $rootScope.$broadcast( 'UPDATE_PROJECTS' );
        };

        /**
         * @name addUpdated
         * @desc
         */
        Project.prototype.addUpdated = function(assets, callback) {
            if (!assets.length) {
                assets = [assets];
            }
            for (var i = 0; i < assets.length; i++) {
                assets[i].classindex = this.getClassIndexForUpdatedAsset( assets[i].okey );
                assets[i].project_status = "updated";
                this.updated.push( assets[i].guid );
            }
            this.save( callback );
            $rootScope.$broadcast( 'UPDATE_PROJECTS' );
        };

        /**
         * @name removeAsset
         * @desc
         */
        Project.prototype.removeAsset = function(asset, callback) {
            var project = this;

            Relationship.findSubtree( asset.id || asset.guid, function(root, tree) {
                var guids = Object.keys( tree ),
                    toBeHardDeleted = [], guid;
                for (var i = 0; i < guids.length; i++) {
                    guid = guids[i];
                    if (project.added.indexOf( guid ) !== -1) {
                        project.added.splice( project.added.indexOf( guid ), 1 );
                    } else if (project.removed.indexOf( guid ) === -1) {
                        project.removed.push( guid );
                        project.assets.splice( project.assets.indexOf( guid ), 1 );
                    }
                    toBeHardDeleted.push( guid );
                }
                Asset.delete( toBeHardDeleted, function() {
                    G3ME.reloadLayers();
                    project.save( callback );
                    $rootScope.$broadcast( "UPDATE_CONSULTATION_ASSETS_LIST" );
                } );
            } );
        };

        /**
         * @name deleteAsset
         * @desc
         */
        Project.prototype.deleteAsset = function(asset, callback) {
            var _this = this;
            Relationship.findSubtree( asset.id || asset.guid, function(root, tree) {
                var guids = Object.keys( tree );
                for (var i = 0; i < guids.length; i++) {
                    if (_this.deleted.indexOf( guids[i] ) === -1) {
                        _this.deleted.push( guids[i] );
                    }
                }
                asset.symbolId = asset.okey + _this.getClassIndex(asset.okey, 'deleted');
                Asset.update( asset, function() {
                    G3ME.reloadLayers();
                } );
                _this.save( callback );
            } );
        };

        /**
         * @name   deleteAssets
         * @desc
         * @param  {[Assets]} assets
         * @param  {Function} callback
         * @return {void}
         */
        Project.prototype.deleteAssets = function(assets, callback) {
            for (var i = 0; i < assets.length; i++) {
                this.deleteAsset( assets[i], (i === assets.length - 1) ? callback : undefined );
            }
        };

        /**
         * @name   hasAsset
         * @param  {Asset}
         * @return {Boolean}
         */
        Project.prototype.hasAsset = function(asset) {
            var myObjects = this.assets.concat( this.added ),
                i,
                lim,
                guidRegExp;
            // Voie rapide pour les guid numériques.
            if (myObjects.indexOf( +asset.guid ) !== -1) {
                return true
            }
            // Pour les objets pas encore synchronisés, guid sous forme de
            // chaîne de caractère.
            guidRegExp = new RegExp("^"+asset.guid+"(\||$)");
            for (i = 0, lim = myObjects.length; i < lim; i++) {
                if ((''+myObjects[i]).match(guidRegExp)) {
                    return true;
                }
            }
            return false;
        };

        /**
         * @name   hasDuplicatedAsset
         * @param  {Asset}
         * @return {Boolean}
         */
        Project.prototype.hasDuplicatedAsset = function(asset) {
            var assets = this.assets.concat( this.added );
            var originals = [];
            for (var i = 0, ii = assets.length; i < ii; i++) {
                if ((assets[i] + "").indexOf( '|' ) === -1) {
                    continue;
                }
                originals.push( assets[i].split( '|' )[0] );
            }
            assets = assets.concat( originals );
            return (assets.indexOf( asset.guid ) !== -1);
        };

        /**
         * @name consult
         * @desc
         */
        Project.prototype.consult = function() {
            Asset.getAllProjectAsset( this, function(assets) {
                $rootScope.$broadcast( "UPDATE_CONSULTATION_ASSETS_LIST", assets, false );
            } );
        };

        /**
         * @name serializeForSQL
         * @desc Serialize les attributs du projet pour la requête SQL
         */
        Project.prototype.serializeForSQL = function() {
            return [this.id, JSON.stringify( this ), JSON.stringify( this.added ), JSON.stringify( this.deleted ), JSON.stringify( this.updated ), JSON.stringify( this.new ), this.loaded];
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
            if (!this.id) {
                (callback || function() {})( false );
                return false;
            }
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
            return $http.get( Utils.getServiceUrl( 'project.mobility.list.json' ) );
        };

        /**
         * @name setMarkersProject
         * @param  {assets} Liste d'assets
         * @param  {relations} Liste des relations entre assets (peu être null)
         * @desc Ajoute un markeur sur chaque asset au chargement d'un projet.
         */
        Project.prototype.setMarkersProject = function(assets, relations) {
            console.log(assets, relations);
            var listCoordinates = [];
            $rootScope.$broadcast( 'REFRESH_CONSULTATION' );
            for (var i = 0; i < assets.length; i++) {
                var asset = new Asset(assets[i]);
                //TODO/FIXME: gérer les relations pour ne mettre un marqueur que sur les elements parents
                asset.showOnMap();
                this.listAssetShow.push(asset);//FIXME: ne pas utiliser une variable, on a deja les assets du projet en base!
                listCoordinates.push((Marker.getMarkerFromAsset(asset))._latlng);
            }

            Asset.focusCoordinates(listCoordinates);
        };

        /**
         * @name unSetMarkersProject
         * @desc Cache tous les markeurs d'un projet.
         */
        Project.prototype.unSetMarkersProject = function() {
            //FIXME: utiliser les assets projet stockés en base plutot que la variable this.listAssetShow qui ne sert à rien
            //Cf setMarkersProject
            if (this.listAssetShow.length != 0) {
                for (var i = 0; i < this.listAssetShow.length; i++) {
                    this.listAssetShow[i].hideFromMap();
                }
            }
        };


        /**
         * @name convertRawRow
         * @desc Converti un projet brut, de la base de données en projet utilisable par l'application
         */
        Project.convertRawRow = function(p) {
            return angular.extend( {
                id: p.id,
                loaded: !(!p.loaded || p.loaded === "false"),
                added: JSON.parse( p.added ),
                deleted: JSON.parse( p.deleted ),
                updated: JSON.parse( p.updated )
            }, JSON.parse( p.json ) );
        };

        Project.prototype.toggleCollapse = function() {
            this.is_open = !this.is_open;
        };

        /**
         * @name getClassIndex
         * @desc Renvoie le class index d'un asset pour un status donné
         */
        Project.prototype.getClassIndex = function(okey, status) {
            okey = okey.replace( "PROJECT_", "" );
            for (var i in this.expressions[okey]) {
                if (i.match(new RegExp(status+"$"))) {
                    return this.expressions[okey][i];
                }
            }
            return 0;
        };

        /**
         * @name getClassIndexForUnchangedAsset
         * @desc Renvoie le class index pour un asset inchangé
         */
        Project.prototype.getClassIndexForUnchangedAsset = function(okey) {
            return this.getClassIndex( okey, 'unchanged' );
        };

        /**
         * @name getClassIndexForAddedAsset
         * @desc Renvoie le class index pour un asset créé
         */
        Project.prototype.getClassIndexForAddedAsset = function(okey) {
            return this.getClassIndex( okey, 'added' );
        };

        /**
         * @name getClassIndexForUpdatedAsset
         * @desc Renvoie le class index pour un asset modifié
         */
        Project.prototype.getClassIndexForUpdatedAsset = function(okey) {
            return this.getClassIndex( okey, 'updated' );
        };

        /**
         * @name getClassIndexForDeletedAsset
         * @desc Renvoie le class index pour un asset supprimé
         */
        Project.prototype.getClassIndexForDeletedAsset = function(okey) {
            return this.getClassIndex( okey, 'deleted' );
        };

        SQLite.exec( Project.database, 'CREATE TABLE IF NOT EXISTS ' + Project.table + '(' + Project.columns.join( ',' ).replace( 'id', 'id unique' ) + ')' );

        return Project;
    }

})();
