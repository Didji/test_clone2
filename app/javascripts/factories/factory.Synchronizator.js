(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Synchronizator', SynchronizatorFactory );

    SynchronizatorFactory.$inject = ["Site", "$http", "$rootScope", "G3ME", "SQLite", "Smartgeo"];


    function SynchronizatorFactory(Site, $http, $rootScope, G3ME, SQLite, Smartgeo) {

        /**
         * @class SyncItemFactory
         * @desc Factory de la classe SyncItem
         */

        function SyncItem(syncitem, action) {
            angular.extend( this, {
                label: (syncitem.getLabel && syncitem.getLabel()) || syncitem.label || this.type || syncitem.type || syncitem.constructor.name,
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
            SQLite.exec( SyncItem.database, 'INSERT OR REPLACE INTO ' + SyncItem.table + '(' + SyncItem.columns.join( ',' ) + ') VALUES (' + SyncItem.prepareStatement + ')', this.serializeForSQL(), callback );
        };

        /**
         * @name save
         * @desc
         */
        SyncItem.prototype.delete = function() {
            this.deleted = true ;
            this.save( function() {
                $rootScope.$broadcast( 'synchronizator_update' );
            } );
        };

        /**
         * @name serializeForSQL
         * @desc
         */
        SyncItem.prototype.serializeForSQL = function() {
            return [this.id, JSON.stringify( this ), this.type, this.action, this.deleted, this.synced];
        };

        /**
         * @name list
         * @desc
         */
        SyncItem.list = function(callback) {
            SQLite.exec( SyncItem.database, 'SELECT * FROM ' + SyncItem.table + ' where deleted != "true"', [], function(rows) {
                var syncItems = [], syncItem ;
                for (var i = 0; i < rows.length; i++) {
                    syncItem = new SyncItem( rows.item( i ) ) ;
                    syncItem = angular.extend( syncItem, JSON.parse( syncItem.json ) );
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

        Synchronizator.add = function(action, object) {
            var syncItem = new SyncItem( object, action );
            syncItem.save( function() {
                $rootScope.$broadcast( 'synchronizator_update' );
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

        Synchronizator.syncItems = function(items, callback) {

            if (items.length === undefined) {
                items = [items];
            }

            if (!items.length) {
                return (callback || function() {})();
            }

            if (!Synchronizator[items[0].action + items[0].type + "Synchronizator"]) {
                return Synchronizator.syncItems( items.slice( 1 ), callback );
            }

            Synchronizator[items[0].action + items[0].type + "Synchronizator"]( items[0], function() {
                Synchronizator.syncItems( items.slice( 1 ), callback );
            } );

        };

        Synchronizator.deleteItem = function(item) {
            item.delete();
        };

        Synchronizator.newComplexAssetSynchronizator = function(complexasset, callback) {

            $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.census.json' ), complexasset, {
                timeout: 100000
            } ).success( function(data) {
                if (!data[complexasset.okey] || !Array.isArray( data[complexasset.okey] ) || !data[complexasset.okey].length) {
                    return;
                }
                complexasset.synced = true ;
                complexasset.save();
                // for (var okey in data) {
                //     for (var i = 0; i < data[okey].length; i++) {
                //         Asset.save( data[okey][i] );
                //     }
                // }
                (callback || function() {})();
            } );

        };

        Synchronizator.newReportSynchronizator = function(report, callback) {

            report.syncInProgress = true;

            $http.post( Smartgeo.getServiceUrl( 'gi.maintenance.mobility.report.json' ), report, {
                timeout: 3e6
            } ).success( function(data) {
                if (!data.cri || !data.cri.length) {
                    report.error = "Erreur inconnue lors de la synchronisation de l'objet.";
                } else {
                    report.synced = true;
                    report.error = undefined;
                }
            } ).error( function(data) {
                report.error = (data && data.error && data.error.text) || "Erreur inconnue lors de la synchronisation de l'objet.";
            } ).finally( function() {
                // log to disk
                (callback || function() {})();
            } );

        };

        return Synchronizator;
    }

})();
