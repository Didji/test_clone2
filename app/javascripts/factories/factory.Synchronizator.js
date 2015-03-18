(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Synchronizator', SynchronizatorFactory );

    SynchronizatorFactory.$inject = ["Site", "$http", "$rootScope", "G3ME", "SQLite", "Smartgeo", "Asset", "i18n", "Relationship"];


    function SynchronizatorFactory(Site, $http, $rootScope, G3ME, SQLite, Smartgeo, Asset, i18n, Relationship) {

        /**
         * @class SyncItemFactory
         * @desc Factory de la classe SyncItem
         */

        function SyncItem(syncitem, action) {
            angular.extend( this, {
                label: (syncitem.getLabel && syncitem.getLabel()) || syncitem.label || this.type || syncitem.type || syncitem.constructor.name,
                description: (syncitem.getDescription && syncitem.getDescription()) || syncitem.description || "",
                type: syncitem.constructor.name,
                action: action,
                id: syncitem.id || syncitem.uuid
            }, syncitem );
        }

        SyncItem.prototype.id = undefined ;
        SyncItem.prototype.json = undefined ;
        SyncItem.prototype.type = undefined ;
        SyncItem.prototype.action = undefined ;
        SyncItem.prototype.deleted = false ;
        SyncItem.prototype.synced = false ;

        SyncItem.database = "parameters" ;
        SyncItem.table = "SYNCITEM" ;
        SyncItem.columns = ['id', 'json', 'type', 'action', 'deleted', 'synced'];
        SyncItem.prepareStatement = SyncItem.columns.join( ',' ).replace( /[a-z]+/gi, '?' );

        /**
         * @name save
         * @desc
         */
        SyncItem.prototype.save = function(callback) {
            SQLite.exec( SyncItem.database, 'INSERT OR REPLACE INTO ' + SyncItem.table + '(' + SyncItem.columns.join( ',' ) + ') VALUES (' + SyncItem.prepareStatement + ')', this.serializeForSQL(), function() {
                $rootScope.$broadcast( 'synchronizator_update' );
                (callback || function() {})();
            } );
        };

        /**
         * @name save
         * @desc
         */
        SyncItem.prototype.delete = function() {
            var item = this ;
            (SyncItem["delete" + item.type] || function(item, callback) {
                (callback || function() {})();
            })( item, function() {
                item.deleted = true ;
                item.save();
            } );
        };

        /**
         * @name serializeForSQL
         * @desc
         */
        SyncItem.prototype.serializeForSQL = function() {
            delete this.relatedAssets;
            delete this.consultationMarker;
            return [this.id, JSON.stringify( this ), this.type, this.action, this.deleted, this.synced];
        };

        /**
         * @name list
         * @desc
         */
        SyncItem.list = function(callback) {
            SQLite.exec( SyncItem.database, 'SELECT * FROM ' + SyncItem.table + ' where deleted != "true" and synced != "true" ', [], function(rows) {
                var syncItems = [], syncItem ;
                for (var i = 0; i < rows.length; i++) {
                    syncItem = new SyncItem( rows.item( i ) ) ;
                    syncItem = angular.extend( syncItem, JSON.parse( syncItem.json ) );
                    syncItem.deleted = syncItem.deleted === "true";
                    syncItem.synced = syncItem.synced === "true";
                    delete syncItem.json;
                    syncItems.push( syncItem );
                }
                (callback || function() {})( syncItems );
            } );
        };

        /**
         * @name listSynced
         * @desc
         */
        SyncItem.listSynced = function(callback) {
            SQLite.exec( SyncItem.database, 'SELECT * FROM ' + SyncItem.table + ' where deleted != "true" and synced == "true" ', [], function(rows) {
                var syncItems = [], syncItem ;
                for (var i = 0; i < rows.length; i++) {
                    syncItem = new SyncItem( rows.item( i ) ) ;
                    syncItem = angular.extend( syncItem, JSON.parse( syncItem.json ) );
                    syncItem.deleted = syncItem.deleted === "true";
                    syncItem.synced = syncItem.synced === "true";
                    delete syncItem.json;
                    syncItems.push( syncItem );
                }
                (callback || function() {})( syncItems );
            } );
        };

        SQLite.exec( SyncItem.database, 'CREATE TABLE IF NOT EXISTS ' + SyncItem.table + '(' + SyncItem.columns.join( ',' ).replace( 'id', 'id unique' ) + ')' );

        /**
         * @class Synchronizator
         * @desc Factory de la classe Synchronizator
         */
        function Synchronizator() {
        }

        Synchronizator.globalSyncInProgress = false ;

        /**
         * @name add
         * @desc
         */
        Synchronizator.add = function(action, object) {
            var syncItem = new SyncItem( object, action );
            syncItem.save( function() {
                Synchronizator.log( object );
                $rootScope.$broadcast( 'synchronizator_new_item' );
            } );
        };

        /**
         * @name addNew
         * @desc
         */
        Synchronizator.addNew = function(object) {
            Synchronizator.add( "new", object );
        };

        /**
         * @name addDeleted
         * @desc
         */
        Synchronizator.addDeleted = function(object) {
            Synchronizator.add( "delete", object );
        };

        /**
         * @name addUpdated
         * @desc
         */
        Synchronizator.addUpdated = function(object) {
            Synchronizator.add( "update", object );
        };

        /**
         * @name listItems
         * @desc
         */
        Synchronizator.listItems = function(callback) {
            SyncItem.list( callback );
        };

        /**
         * @name listItems
         * @desc
         */
        Synchronizator.listSyncedItems = function(callback) {
            SyncItem.listSynced( callback );
        };

        /**
         * @name syncItems
         * @desc
         */
        Synchronizator.syncItems = function(items, callback, force) {
            if (Synchronizator.globalSyncInProgress && !force) {
                return;
            }

            Synchronizator.globalSyncInProgress = true ;

            if (items.length === undefined) {
                items = [items];
            }

            if (!items.length) {
                G3ME.reloadLayers();
                Synchronizator.globalSyncInProgress = false ;
                return (callback || function() {})();
            }
            if (!Synchronizator[items[0].action + items[0].type + "Synchronizator"]) {
                console.info( items[0].action + items[0].type + "Synchronizator", "not found" );
                return Synchronizator.syncItems( items.slice( 1 ), callback, true );
            }

            Synchronizator[items[0].action + items[0].type + "Synchronizator"]( items[0], function() {
                Synchronizator.syncItems( items.slice( 1 ), callback, true );
            } );

        };

        /**
         * @name deleteItem
         * @desc
         */
        Synchronizator.deleteItem = function(item) {
            item.delete();
        };

        /**
         * @name newComplexAssetSynchronizator
         * @desc
         */
        Synchronizator.newComplexAssetSynchronizator = function(complexasset, callback) {
            var assets = [] ;
            complexasset.syncInProgress = true;
            $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.census.json' ), complexasset, {
                timeout: 1e5
            } ).success( function(data) {
                if (data[complexasset.okey] && Array.isArray( data[complexasset.okey] ) && data[complexasset.okey].length) {
                    complexasset.synced = true ;
                    var savedGeometry , i , savedbounds ;
                    for (var okey in data) {
                        if (okey === "relationship") {
                            continue ;
                        }
                        for (i = 0; i < data[okey].length; i++) {
                            if (data[okey][i].geometry) {
                                savedGeometry = data[okey][i].geometry;
                                savedbounds = data[okey][i].bounds;
                            }
                            assets.push( data[okey][i] );
                        }
                    }
                    Asset.delete( complexasset.uuids, function() {
                        Asset.save( assets, function() {
                            Relationship.save( data.relationship, function() {
                                complexasset.syncInProgress = false;
                                complexasset.save( callback );
                            } );
                        } );
                    } );
                } else {
                    complexasset.error = i18n.get( "_SYNC_UNKNOWN_ERROR_" );
                    (callback || function() {})();
                }
            } ).error( function(data, code) {
                if (+code === 404) {
                    complexasset.synced = true ;
                    complexasset.syncInProgress = false;
                    complexasset.save( callback );
                    alertify.alert( i18n.get( "_SYNC_UPDATE_HAS_BEEN_DELETED" ) );
                    Asset.delete( Asset.getIds( complexasset ) );
                } else {
                    complexasset.error = (data && data.error && data.error.text) ;
                }
                complexasset.syncInProgress = false;
                complexasset.save( callback );
            } );

        };

        /**
         * @name updateComplexAssetSynchronizator
         * @desc
         */
        Synchronizator.updateComplexAssetSynchronizator = function(complexasset, callback) {
            Synchronizator.newComplexAssetSynchronizator( complexasset, callback );
        };

        /**
         * @name deleteAssetSynchronizator
         * @desc
         */
        Synchronizator.deleteAssetSynchronizator = function(asset, callback) {
            asset.syncInProgress = true;
            $http.post(
                Smartgeo.getServiceUrl( 'gi.maintenance.mobility.installation.assets.json' ),
                {
                    deleted: asset.payload
                }
            ).success( function(data) {
                if (Asset.handleDeleteAssets( data )) {
                    asset.synced = true;
                    asset.save();
                }
            } ).error( function(data) {
                Asset.handleDeleteAssets( data );
            } ).finally( function() {
                asset.syncInProgress = false;
                (callback || function() {})();
            } );
        };

        /**
         * @name newReportSynchronizator
         * @desc
         */
        Synchronizator.newReportSynchronizator = function(report, callback) {
            report.syncInProgress = true;
            $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.report.json' ), report, {
                timeout: 3e6
            } ).success( function(data) {
                if (data.cri && data.cri.length) {
                    report.synced = true;
                    report.error = undefined;
                } else {
                    report.error = i18n.get( "_SYNC_UNKNOWN_ERROR_" );
                }
            } ).error( function(data) {
                report.error = (data && data.error && data.error.text) || "Erreur inconnue lors de la synchronisation du compte rendu.";
            } ).finally( function() {
                report.syncInProgress = false;
                report.save( callback );
            } );
        };

        /**
         * @name getAll
         * @desc
         */
        Synchronizator.getAll = function(type, callback) {
            Synchronizator.listItems( function(items) {
                var typedItems = [];
                for (var i = 0, ii = items.length; i < ii; i++) {
                    if (items[i].type === type) {
                        typedItems.push( items[i] );
                    }
                }
                (callback || function() {})( typedItems );
            } );
        };

        /**
         * @name getAll
         * @desc
         */
        Synchronizator.getAllSynced = function(type, callback) {
            Synchronizator.listSyncedItems( function(items) {
                var typedItems = [];
                for (var i = 0, ii = items.length; i < ii; i++) {
                    if (items[i].type === type) {
                        typedItems.push( items[i] );
                    }
                }
                (callback || function() {})( typedItems );
            } );
        };

        /**
         * @name log
         * @desc
         */
        Synchronizator.log = function(item) {
            if (item.ged) {
                delete item.ged;
            }
            if (window.SmartgeoChromium && window.SmartgeoChromium.writeJSON) {
                SmartgeoChromium.writeJSON( JSON.stringify( item ), 'report/' + item.uuid || item.id + '.json' );
            }
            return this;
        };

        /**
         * @name checkSynchronizedReports
         * @desc
         */
        Synchronizator.checkSynchronizedReports = function() {
            Synchronizator.getAllSynced( 'Report', function(reports) {
                var luuids = [];
                for (var i = 0; i < reports.length; i++) {
                    luuids.push( reports[i].uuid );
                }
                $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.report.check.json' ), {
                    uuids: luuids
                } ).success( function(data) {
                    if ((typeof data) === "string") {
                        return;
                    }
                    var ruuids = data.uuids || data;
                    for (var i = 0, ii = reports.length; i < ii; i++) {
                        if (ruuids[reports[i].uuid]) {
                            reports[i].delete();
                        }
                    }
                } );
            } );
        };

        return Synchronizator;
    }

})();