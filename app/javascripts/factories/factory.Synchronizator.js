(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Synchronizator', SynchronizatorFactory );

    SynchronizatorFactory.$inject = ["Site", "$http", "$rootScope", "G3ME", "SQLite", "Smartgeo", "Asset", "i18n"];


    function SynchronizatorFactory(Site, $http, $rootScope, G3ME, SQLite, Smartgeo, Asset, i18n) {

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
            return [this.id, JSON.stringify( this ), this.type, this.action, this.deleted, this.synced];
        };


        SyncItem.deleteComplexAsset = function(item, callback) {
            Asset.delete( item.uuids, function() {
                G3ME.reloadLayers();
                (callback || function() {})();
            } );
        };

        SyncItem.prototype.deleteReport = function() {};


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

        SQLite.exec( SyncItem.database, 'CREATE TABLE IF NOT EXISTS ' + SyncItem.table + '(' + SyncItem.columns.join( ',' ).replace( 'id', 'id unique' ) + ')' );


        /**
         * @class Synchronizator
         * @desc Factory de la classe Synchronizator
         */
        function Synchronizator() {
        }

        Synchronizator.globalSyncInProgress = false ;

        Synchronizator.add = function(action, object) {
            var syncItem = new SyncItem( object, action );
            Synchronizator.log( object );
            syncItem.save( function() {
                $rootScope.$broadcast( 'synchronizator_new_item' );
            } );
        };

        Synchronizator.addNew = function(object) {
            Synchronizator.add( "new", object );
        };

        Synchronizator.addDeleted = function(object) {
            Synchronizator.add( "delete", object );
        };

        Synchronizator.addUpdated = function(object) {
            Synchronizator.add( "update", object );
        };

        Synchronizator.listItems = function(callback) {
            SyncItem.list( callback );
        };

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

        Synchronizator.deleteItem = function(item) {
            item.delete();
        };

        Synchronizator.newComplexAssetSynchronizator = function(complexasset, callback) {
            var assets = [] ;
            complexasset.syncInProgress = true;
            $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.census.json' ), complexasset, {
                timeout: 1e5
            } ).success( function(data) {
                if (data[complexasset.okey] && Array.isArray( data[complexasset.okey] ) && data[complexasset.okey].length) {
                    complexasset.synced = true ;
                    for (var okey in data) {
                        for (var i = 0; i < data[okey].length; i++) {
                            assets.push( data[okey][i] );
                        }
                    }
                    Asset.delete( complexasset.uuids, function() {
                        Asset.save( assets, function() {
                            complexasset.syncInProgress = false;
                            complexasset.save( callback );
                        } );
                    } );
                } else {
                    complexasset.error = i18n.get( "_SYNC_UNKNOWN_ERROR_" );
                }
            } ).error( function(data) {
                complexasset.error = (data && data.error && data.error.text) ;
                complexasset.syncInProgress = false;
                complexasset.save( callback );
            } );

        };

        Synchronizator.updateComplexAssetSynchronizator = function(complexasset, callback) {
            Synchronizator.newComplexAssetSynchronizator( complexasset, callback );
        };

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

        Synchronizator.log = function(item) {
            item = angular.copy( item );
            if (item.ged) {
                delete item.ged;
            }
            if (window.SmartgeoChromium && window.SmartgeoChromium.writeJSON) {
                SmartgeoChromium.writeJSON( JSON.stringify( item ), 'report/' + item.uuid || item.id + '.json' );
            }
            return this;
        };

        /**
         * @param strClass:
         *          class name
         * @param optionals:
         *          constructor arguments
         */
        Synchronizator.newInstance = function(strClass) {
            var args = Array.prototype.slice.call( arguments, 1 );
            var clsClass = eval( strClass );
            function F() {
                return clsClass.apply( this, args );
            }
            F.prototype = clsClass.prototype;
            return new F();
        };

        // Synchronizator.checkSynchronizedReports = function() {
        //     ReportSynchronizer.getAll( function(reports) {

        //         var luuids = [];

        //         for (var i = 0; i < reports.length; i++) {
        //             if (reports[i].synced) {
        //                 luuids.push( reports[i].uuid );
        //             }
        //         }

        //         $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.report.check.json' ), {
        //             uuids: luuids
        //         } )
        //             .success( function(data) {
        //                 if ((typeof data) === "string") {
        //                     return;
        //                 }
        //                 var ruuids = data.uuids || data;
        //                 for (var uuid in ruuids) {
        //                     if (ruuids[uuid]) {
        //                         console.warn( uuid + ' must be deleted' );
        //                         ReportSynchronizer.deleteInDatabase( uuid );
        //                     } else {
        //                         console.warn( uuid + ' must be resync' );
        //                         ReportSynchronizer.synchronize( uuid );
        //                     }
        //                 }
        //             } )
        //             .error( function() {} );

        //     } );
        // };

        return Synchronizator;
    }

})();
