(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Sync', SyncFactory );

    SyncFactory.$inject = ["Site", "$http", "$rootScope", "G3ME", "SQLite", "Smartgeo", "AssetFactory", "Asset", "i18n", "Relationship", "ComplexAsset"];


    function SyncFactory(Site, $http, $rootScope, G3ME, SQLite, Smartgeo, AssetFactory, Asset, i18n, Relationship, ComplexAsset) {

        /**
         * @class SyncFactory
         * @desc Factory de la classe Sync
         */

        function Sync() {
        }

        Sync.prototype.id = undefined ;
        Sync.prototype.json = undefined ;
        Sync.prototype.type = undefined ;
        Sync.prototype.action = undefined ;

        Sync.database = "parameters" ;
        Sync.table = "SYNCS" ;
        Sync.columns = ['id', 'json', 'type', 'action'];
        Sync.prepareStatement = Sync.columns.join( ',' ).replace( /[a-z]+/gi, '?' );

        /**
         * @name load
         * @desc Télécharge et charge un projet depuis le serveur
         */
        Sync.prototype.load = function(callback) {
            if (this.loaded) {
                return this.setSyncLoaded( callback );
            }
            var Sync = this ;
            if (Sync.currentLoadedSync && Sync.currentLoadedSync.id !== this.id) {
                return Sync.currentLoadedSync.unload( function() {
                    Sync.load( callback );
                } );
            }
            this.loading = true ;
            $http.get( Smartgeo.getServiceUrl( 'Sync.mobility.load.json', {
                id: this.id
            } ) ).success( function(data) {
                Sync.setAssets( data.assets, data.relations, function() {
                    Sync.setSyncLoaded( callback );
                } );
            } ).error( Sync.smartgeoReachError ).finally( function() {
                Sync.loading = false ;
            } );
        };

        /**
         * @name unload
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Sync.prototype.unload = function(callback) {
            var Sync = this ;
            if (this.hasBeenModified()) {
                return alertify.alert( i18n.get( '_SyncS_LOADED_Sync_NOT_SAVE_' ) );
            }
            this.unloading = true ;
            $http.get( Smartgeo.getServiceUrl( 'Sync.mobility.unload.json', {
                id: this.id
            } ) ).success( function() {
                Sync.setSyncUnloaded( callback );
            } ).error( Sync.smartgeoReachError ).finally( function() {
                Sync.unloading = false ;
            } );
        };

        /**
         * @name synchronize
         * @desc Décharge un projet, localement, et sur le serveur
         */
        Sync.prototype.synchronize = function(callback) {
            var Sync = this;
            this.synchronizing = true;
            this.remoteAddRemoveAssets( callback );
        };

        /**
         * @name remoteAddRemoveAssets
         * @desc Synchronize l'ajout et le relachement d'asset avec le serveur
         */
        Sync.prototype.remoteAddRemoveAssets = function(callback) {
            var Sync = this ;
            this.getAddRemovePayload( function(payload) {
                $http.put( Smartgeo.getServiceUrl( 'Sync.mobility.save.json', {
                    id_Sync: Sync.id
                } ), payload ).success( function() {
                    Sync.remoteNewUpdateDeleteAssets( callback );
                } ).error( Sync.handleRemoteSaveError ).finally( function() {
                    Sync.synchronizing = false ;
                } );
            } );
        };


        /**
         * @name getAddRemovePayload
         * @desc Construit la payload pour le service d'ajout et de relachement d'asset
         */
        Sync.prototype.getAddRemovePayload = function(callback) {
            var payload = {
                    'added': {},
                    'removed': {}
                },
                Sync = this ;

            Asset.findAssetsByGuids( this.added.concat( this.removed ), function(assets) {
                for (var i = 0; i < assets.length; i++) {
                    if (Sync.added.indexOf( assets[i].id ) !== -1) {
                        payload.added[assets[i].okey] = payload.added[assets[i].okey] || [];
                        payload.added[assets[i].okey].push( assets[i].id );
                    } else if (Sync.removed.indexOf( assets[i].id ) !== -1) {
                        payload.removed[assets[i].okey] = payload.removed[assets[i].okey] || [];
                        payload.removed[assets[i].okey].push( assets[i].id );
                    }
                }

                callback( payload );
            } );
        };

        /**
         * @name handleRemoteSaveError
         * @desc Gére les erreurs remontées du service d'ajout/relachement d'asset
         */
        Sync.handleRemoteSaveError = function(data, status) {
            switch (status) {
                case 400:
                    if (data.locked) {
                        var locked = [];
                        Asset.findAssetsByGuids( data.locked, function(assets) {
                            for (var i = 0; i < assets.length; i++) {
                                locked.push( Site.current.metamodel[assets[i].okey].label + " " + assets[i].label );
                            }
                            alertify.alert( i18n.get( '_Sync_ASSETS_ARE_LOCKED_', locked.sort().join( ", " ) ) );
                        } );
                    }
                    break;
                case 500:
                default:
                    Sync.smartgeoReachError();
                    break;
            }
        };

        /**
         * @name remoteNewUpdateDeleteAssets
         * @desc Synchronise la création, la modification et la suppression d'asset
         */
        Sync.prototype.remoteNewUpdateDeleteAssets = function(callback) {
            var Sync = this ;
            this.getNewUpdateDeletePayload( function(payload) {
                $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.installation.assets.json', {
                    id_Sync: Sync.id
                } ), payload ).success( function() {
                    Sync.discardChanges( callback );
                } ).error( Sync.smartgeoReachError ).finally( function() {
                    Sync.synchronizing = false ;
                } );
            } );
        };


        /**
         * @name getNewUpdateDeletePayload
         * @desc Construit la payload pour le service de création, modification et suppression d'asset
         */
        Sync.prototype.getNewUpdateDeletePayload = function(callback) {
            var payload = {
                    'deleted': [],
                    'new': [],
                    'updated': []
                },
                Sync = this ;
            ComplexAsset.find( this.new, function(complexes) {
                payload.new = complexes;
                Asset.findAssetsByGuids( Sync.deleted.concat( Sync.updated ), function(assets) {
                    for (var i = 0; i < assets.length; i++) {
                        if (Sync.deleted.indexOf( assets[i].id ) !== -1) {
                            payload.deleted.push( assets[i] );
                        } else if (Sync.updated.indexOf( assets[i].id ) !== -1) {
                            payload.updated.push( assets[i] );
                        }
                    }
                    callback( payload );
                } );
            } );
        };



        /**
         * @name setSyncLoaded
         * @desc
         */
        Sync.prototype.setSyncLoaded = function(callback) {
            this.loaded = true ;
            this.loading = false ;
            Sync.save( this, callback );
            Sync.currentLoadedSync = this ;
            $rootScope.$broadcast( 'NEW_Sync_LOADED' );
            if (!$rootScope.$$phase) {
                $rootScope.$apply();
            }
            G3ME.__updateMapLayers();
        };

        /**
         * @name setSyncUnloaded
         * @desc
         */
        Sync.prototype.setSyncUnloaded = function(callback) {
            var Sync = this,
                assets = Sync.assets;
            this.loaded = false ;
            this.unloading = false ;
            Asset.deleteAllSyncAsset();
            Asset.delete( this.assets, function() {
                Sync.save( Sync, callback );
                Sync.currentLoadedSync = null ;
                $rootScope.$broadcast( "_REMOTE_DELETE_ASSETS_", assets );
                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
                G3ME.__updateMapLayers();
            } );
        };

        /**
         * @name hasBeenModified
         * @desc
         */
        Sync.prototype.hasBeenModified = function() {
            return (this.new.length + this.deleted.length + this.updated.length + this.added.length + this.removed.length) > 0;
        };

        Sync.prototype.getAssetLength = function() {
            return this.new.length + this.deleted.length + this.updated.length + this.added.length + this.removed.length + this.assets.length;
        };

        Sync.smartgeoReachError = function() {
            alertify.alert( i18n.get( '_SyncS_CANNOT_REACH_SMARTGEO_' ) );
        };

        /**
         * @name setAssets
         * @desc
         */
        Sync.prototype.setAssets = function(assets, relations, callback) {
            var Sync = this ;
            if (relations && relations.length) {
                Relationship.save( relations );
            }
            Sync.assets = [];
            for (var i = 0; i < assets.length; i++) {
                Sync.assets.push( assets[i].guid );
                assets[i].okey = "Sync_" + assets[i].okey;
            }
            Asset.delete( Sync.assets, function() {
                AssetFactory.save( assets, null, function() {
                    Sync.save( callback );
                } );
            } );
        };

        /**
         * @name discardChanges
         * @desc
         */
        Sync.prototype.discardChanges = function(callback) {
            var Sync = this ;
            this.added = [];
            this.removed = [];
            this.new = [];
            this.updated = [];
            this.deleted = [];
            Asset.delete( [], function() {
                Sync.unload( callback );
            } );
        };

        /**
         * @name addAsset
         * @desc
         */
        Sync.prototype.addAsset = function(asset, callback) {
            var Sync = this;

            Relationship.findSubtree( asset.id || asset.guid, function(root, tree) {
                var guids = Object.keys( tree );

                for (var i = 0; i < guids.length; i++) {
                    if (Sync.removed.indexOf( +guids[i] ) !== -1) {
                        Sync.removed.splice( Sync.removed.indexOf( +guids[i] ), 1 );
                        Sync.assets.push( +guids[i] );
                    } else if (Sync.added.indexOf( +guids[i] ) === -1) {
                        Sync.added.push( +guids[i] );
                    }
                }

                Sync.save( callback );
            } );
        };

        /**
         * @name addAssets
         * @desc
         */
        Sync.prototype.addAssets = function(assets, callback) {
            for (var i = 0; i < assets.length; i++) {
                this.addAsset( assets[i], (i === assets.length - 1) ? callback : undefined );
            }
        };

        /**
         * @name addNew
         * @desc
         */
        Sync.prototype.addNew = function(assets, callback) {
            if (!assets.length) {
                assets = [assets];
            }
            for (var i = 0; i < assets.length; i++) {
                assets[i].Sync_status = "added";
                this.new.push( assets[i].guid );
                this.assets.push( assets[i].guid );
            }
            this.save( callback );
        };

        /**
         * @name removeAsset
         * @desc
         */
        Sync.prototype.removeAsset = function(asset, callback) {
            var Sync = this;
            Relationship.findSubtree( asset.id || asset.guid, function(root, tree) {
                var guids = Object.keys( tree ),
                    toBeHardDeleted = [], guid;
                for (var i = 0; i < guids.length; i++) {
                    guid = +guids[i];
                    if (Sync.added.indexOf( guid ) !== -1) {
                        Sync.added.splice( Sync.added.indexOf( guid ), 1 );
                    } else if (Sync.removed.indexOf( guid ) === -1) {
                        Sync.removed.push( guid );
                        Sync.assets.splice( Sync.assets.indexOf( guid ), 1 );
                        toBeHardDeleted.push( guid );
                    }
                }
                Asset.delete( toBeHardDeleted, function() {
                    G3ME.__updateMapLayers();
                    Sync.save( callback );
                } );
            } );
        };

        /**
         * @name   deleteAsset
         * @desc
         * @param  {Asset}    asset
         * @param  {Function} callback
         * @return {void}
         */
        Sync.prototype.deleteAsset = function(asset, callback) {
            var Sync = this;

            Relationship.findSubtree( asset.id || asset.guid, function(root, tree) {
                var guids = Object.keys( tree );

                for (var i = 0; i < guids.length; i++) {
                    if (Sync.deleted.indexOf( +guids[i] ) === -1) {
                        Sync.deleted.push( +guids[i] );
                    }
                }
                Sync.save( callback );
            } );
        };

        /**
         * @name   deleteAssets
         * @desc
         * @param  {[Assets]} assets
         * @param  {Function} callback
         * @return {void}
         */
        Sync.prototype.deleteAssets = function(assets, callback) {
            for (var i = 0; i < assets.length; i++) {
                this.deleteAsset( assets[i], (i === assets.length - 1) ? callback : undefined );
            }
        };

        /**
         * @name   hasAsset
         * @param  {Asset}
         * @return {Boolean}
         */
        Sync.prototype.hasAsset = function(asset) {
            return (this.assets.indexOf( asset.guid ) !== -1 || this.added.indexOf( asset.guid ) !== -1);
        };

        /**
         * @name consult
         * @desc
         */
        Sync.prototype.consult = function() {
            Asset.getAllSyncAsset( this, function(assets) {
                $rootScope.$broadcast( "UPDATE_CONSULTATION_ASSETS_LIST", assets, false );
            } );
        };

        /**
         * @name serializeForSQL
         * @desc Serialize les attributs du projet pour la requête SQL
         */
        Sync.prototype.serializeForSQL = function() {
            return [this.id, JSON.stringify( this ), JSON.stringify( this.added ), JSON.stringify( this.deleted ), JSON.stringify( this.updated ), JSON.stringify( this.new ), this.loaded];
        };

        /**
         * @name getLoadedSync
         * @desc Enregistre un projet en base de données
         */
        Sync.getLoadedSync = function(callback) {
            SQLite.exec( Sync.database, 'SELECT * FROM ' + Sync.table + ' WHERE loaded = ? ', ["true"], function(rows) {
                (callback || function() {})( rows.length ? new Sync( Sync.convertRawRow( rows.item( 0 ) ) ) : false );
            } );
        };

        /**
         * @name save
         * @desc Enregistre un projet en base de données
         */
        Sync.save = function(Sync, callback) {
            if (!(Sync instanceof Sync)) {
                Sync = new Sync( Sync );
            }
            return Sync.save( callback );
        };

        /**
         * @name save
         * @desc Enregistre un projet en base de données
         */
        Sync.prototype.save = function(callback) {
            if (!this.id) {
                callback( false );
                return false;
            }
            SQLite.exec( Sync.database, 'INSERT OR REPLACE INTO ' + Sync.table + '(' + Sync.columns.join( ',' ) + ') VALUES (' + Sync.prepareStatement + ')', this.serializeForSQL(), callback );
            return this;
        };

        /**
         * @name find
         * @desc Requête la base de données locales pour trouver un projet à partir d'un identifiant
         */
        Sync.find = function(id, callback) {
            SQLite.exec( Sync.database, 'SELECT * FROM ' + Sync.table + ' WHERE id = ? ', [id], function(rows) {
                (callback || function() {})( rows.length ? new Sync( Sync.convertRawRow( rows.item( 0 ) ) ) : false );
            } );
        };

        /**
         * @name findAll
         * @desc Requête la base de données locales pour trouver tous les projets
         */
        Sync.findAll = function(callback) {
            SQLite.exec( Sync.database, 'SELECT * FROM ' + Sync.table, [], function(rows) {
                var Syncs = [];
                for (var i = 0; i < rows.length; i++) {
                    Syncs.push( new Sync( Sync.convertRawRow( rows.item( i ) ) ) );
                }
                (callback || function() {})( Syncs );
            } );
        };

        /**
         * @name list
         * @desc Requête le serveur pour récupérer les projets de l'utilisateur connecté.
         */
        Sync.list = function() {
            return $http.get( Smartgeo.getServiceUrl( 'Sync.mobility.list.json' ) );
        };


        /**
         * @name convertRawRow
         * @desc Converti un projet brute, de la base de données en projet utilisable par l'application
         */
        Sync.convertRawRow = function(p) {
            return angular.extend( {
                id: p.id,
                loaded: p.loaded,
                added: JSON.parse( p.added ),
                deleted: JSON.parse( p.deleted ),
                updated: JSON.parse( p.updated )
            }, JSON.parse( p.json ) );
        };

        Sync.prototype.toggleCollapse = function() {
            this.is_open = !this.is_open;
        };

        SQLite.exec( Sync.database, 'CREATE TABLE IF NOT EXISTS ' + Sync.table + '(' + Sync.columns.join( ',' ).replace( 'id', 'id unique' ) + ')' );

        return Sync;
    }

})();
