( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Asset', AssetFactory );

    AssetFactory.$inject = ["G3ME", "Marker", "SQLite", "Storage", "$rootScope", "$http", "Site", "GPS", "Relationship", "Right", "Utils"];


    function AssetFactory(G3ME, Marker, SQLite, Storage, $rootScope, $http, Site, GPS, Relationship, Right, Utils) {

        /**
         * @class AssetFactory
         * @desc Factory de la classe Asset
         *
         * @property {Boolean} onMap L'objet est il affiché sur la carte ?
         * @property {L.Marker} consultationMarker Marker de consultation (Leaflet)
         */
        function Asset(asset, callback, getRelated) {
            var self = this,
                locked_assets = Storage.get( 'locked_assets' );

            if (typeof asset === 'string' || typeof asset === 'number') {
                Asset.findOne( asset, function(asset) {
                    angular.extend( self, new Asset( asset, callback, getRelated ) );
                } );
                return;
            }
            asset.locked = locked_assets ? locked_assets.indexOf( +asset.id ) !== -1 : false;
            angular.extend( this, asset );
            if (getRelated) {
                this.findRelated( callback );
            } else {
                (callback || function() {}) (this );
            }
        }

        Asset.cache = { };

        Asset.__maxIdPerRequest = 999;
        Asset.__maxResultPerSearch = 10;

        Asset.prototype.onMap = false;

        Asset.prototype.consultationMarker = false;

        Asset.prototype.findRelated = function(callback) {
            var self = this;

            if (this.isComplex != undefined) {
                return (callback || angular.noop) ( self );
            }
            Relationship.findRelated( this.id || this.guid, function(root, tree) {
                if (!root) {
                    return (callback || angular.noop) ( self );
                }
                Asset.findAssetsByGuids( Object.keys( tree ), function(assets_) {
                    if (assets_.length <= 1 || assets_[0].guid === assets_[1].guid) {
                        self.isComplex = false;
                        return (callback || angular.noop) ( self );
                    }
                    var assets_byId = {};
                    for (var i = 0; i < assets_.length; i++) {
                        assets_byId[assets_[i].id] = new Asset( assets_[i] );
                    }
                    Asset.sortTree( tree, assets_ );
                    self.isComplex = true;
                    self.tree = tree;
                    self.root = root;
                    self.relatedAssets = assets_byId;
                    (callback || angular.noop) ( self );
                } );
            } );
        };

        /**
        * @name sortTree
        * @desc Trie l'arbre des relations d'un objet selon leur label
        */
        Asset.sortTree = function(tree, assets) {
            // On trie les assets en fonction de leur label et on récupère leurs ids triés
            assets.sort( function(a, b) {
                return (a.label < b.label ? -1 : (a.label > b.label ? 1 : 0));
            } );
            var tempChildren = [];
            for (var i = 0; i < assets.length; i++) {
                var id = assets[i].id;
                tempChildren.push( id );
            }

            // Itère sur les objets selon le schéma {id parent : [id enfants]}
            for (var key in tree) {
                if (tree.hasOwnProperty( key )) {
                    var children = tree[key];

                    // Si pas d'enfants, on zappe
                    if (children.length === 0) {
                        continue;
                    }

                    // Les ids triés plus haut deviennent les nouveaux enfants,
                    // mais on ne prend pas en compte les ids qui n'existaient pas dans les anciens enfants
                    tree[key] = tempChildren.filter( function(obj) {
                        return children.indexOf( obj ) != -1;
                    } );
                }
            }
        };

        /**
         * @name showOnMap
         * @desc Montre l'objet sur la carte avec un marqueur
         */
        Asset.prototype.showOnMap = function(dontPlaceMarker) {
            if (this.relatedAssets && this.relatedAssets[this.id]) {
                this.relatedAssets[this.id].showOnMap( true );
            }

            var self = this;
            this.onMap = true;
            if (!dontPlaceMarker) {
                this.consultationMarker = this.consultationMarker || Marker.getMarkerFromAsset( this, function() {
                        self.zoomOn();
                    } );
                if (G3ME.map) {
                    this.consultationMarker.addTo( G3ME.map );
                }
            }

        };

        /**
         * @name hideFromMap
         * @desc Cache l'objet de la carte
         */
        Asset.prototype.hideFromMap = function() {
            if (this.relatedAssets) {
                for (var i in this.relatedAssets) {
                    this.relatedAssets[i].hideFromMap();
                }
            }

            this.onMap = false;
            if (G3ME.map) {
                G3ME.map.removeLayer( this.consultationMarker );
            }
        };

        /**
         * @name focusCoordinates
         * @param  {listCoordinates} Tableau contenant plusieurs coordonnées
         * @desc Zoom sur les coordonnées passées en paramètre
         */
        Asset.focusCoordinates = function(listCoordinates) {
            var bounds = new L.LatLngBounds( listCoordinates );
            G3ME.map.fitBounds( bounds, {
                padding: [25, 25]
            } );
        };

        /**
         * @name toggleMapVisibility
         * @desc Change la visibilité de l'objet sur la carte
         */
        Asset.prototype.toggleMapVisibility = function(dontPlaceMarker) {
            this[this.onMap ? "hideFromMap" : "showOnMap"]( dontPlaceMarker );
        };

        /**
         * @name zoomOn
         * @desc Zoom sur l'objet
         */
        Asset.prototype.zoomOn = function() {
            if (this.consultationMarker._map._zoom <= 18) {
                G3ME.map.setView( this.getCenter(), 18 );
            } else {
                G3ME.map.setView( this.getCenter(), this.consultationMarker._map._zoom );
            }
            $rootScope.$broadcast( "DESACTIVATE_POSITION" );
        };

        /**
         * @name isUpdatable
         * @desc
         */
        Asset.prototype.isUpdatable = function() {
            return Right.isUpdatable( this );
        };

        /**
         * @name isReadOnly
         * @desc
         */
        Asset.prototype.isReadOnly = function() {
            return Right.isReadOnly( this );
        };

        /**
         * @name fetchHistory
         * @desc Recherche l'historique de maintenance sur le server
         */
        Asset.prototype.fetchHistory = function() {
            var self = this;
            $http.get( Utils.getServiceUrl( 'gi.maintenance.mobility.history', {
                id: this.guid,
                limit: 5
            } ) ).success( function(data) {
                self.reports = data;
            } ).error( function(error) {
                self.reports = [];
                console.error( error );
            } ).finally( function() {
                if (self.isComplex && self.relatedAssets[self.id]) {
                    self.relatedAssets[self.id].reports = self.reports;
                }
            } );
        };

        /**
         * @name goTo
         * @desc Lance le GPS pour se rendre jusqu'à l'objet
         */
        Asset.prototype.goTo = function() {
            var center = this.getCenter();
            launchnavigator.navigate( [center[0], center[1]] );
        };

        /**
         * @name getCenter
         * @desc Retourne le centre d'un objet
         */
        Asset.prototype.getCenter = function() {
            var coordinates = this.geometry.coordinates;

            if (this.geometry.type === "Point") {
                return [coordinates[1], coordinates[0]];
            } else {
                return Asset.getLineStringMiddle( coordinates );
            }
        };

        /**
         * @name getCenter
         * @desc Retourne le centre d'un objet
         */
        Asset.getCenter = function(asset) {
            var coordinates = asset.geometry.coordinates;

            if (asset.geometry.type === "Point") {
                return [coordinates[1], coordinates[0]];
            } else {
                return Asset.getLineStringMiddle( coordinates );
            }
        };

        /**
         * @name addToMission
         * @desc Ajoute l'objet à une mission
         * @param {Object} mission
         */
        Asset.prototype.addToMission = function(mission, e) {
            if (e) {
                e.preventDefault();
            }
            $rootScope.addAssetToMission( this, mission );
        };

        /**
         * @name addToMission
         * @desc Ajoute l'objet à une mission
         * @param {Object} mission
         */
        Asset.prototype.addToTour = function(tour, e) {
            if (e) {
                e.preventDefault();
            }
            $rootScope.addAssetToTour( this );
        //$rootScope.$broadcast( '_ADD_ASSET_TO_TOUR_', this );
        };

        /**
         * @name getLineStringMiddle
         * @desc Retourne le milieu d'un LineString
         * @param {Array[]} coordinates Géometrie de l'objet
         */
        Asset.getLineStringMiddle = function(coordinates) {
            var length = 0,
                a, b, i, raptor, middle;
            for (i = 0; i < coordinates.length - 1; i++) {
                a = coordinates[i];
                b = coordinates[i + 1];
                a[2] = length;
                length += Math.sqrt( Math.pow( b[0] - a[0], 2 ) + Math.pow( b[1] - a[1], 2 ) );
            }
            coordinates[coordinates.length - 1][2] = length;
            middle = length / 2;
            for (i = 0; i < coordinates.length - 1; i++) {
                a = coordinates[i];
                b = coordinates[i + 1];
                if (a[2] <= middle && middle <= b[2]) {
                    raptor = (middle - a[2]) / (b[2] - a[2]);
                    return [a[1] + raptor * (b[1] - a[1]), a[0] + raptor * (b[0] - a[0]), a];
                }
            }
        };

        /**
         * @name findOne
         * @desc Cherche un objet en fonction de son identifiant
         * @param {Number} id
         * @param {Function} callback
         * @param {Array} zones
         */
        Asset.findOne = function(id, callback, zones) {

            var tmp = +id;
            if (!isNaN( tmp )) {
                id = +id;
            }

            if (Asset.cache[id]) {
                return callback( angular.copy( Asset.cache[id] ) );
            }

            zones = zones || Site.current.zones;

            if (!zones.length) {
                return callback( null );
            }

            SQLite.exec( zones[0].database_name, 'SELECT * FROM ASSETS WHERE id = ?', ["" + id], function(rows) {
                if (!rows.length) {
                    return Asset.findOne( id, callback, zones.slice( 1 ) );
                }
                Asset.cache[id] = new Asset( Asset.convertRawRow( rows.item( 0 ) ) );
                callback( angular.copy( Asset.cache[id] ) );
            } );

        };

        /**
         * @name findInBounds
         * @desc Cherche
         * @param {Function} callback
         */
        Asset.findInBounds = function(center, bounds, callback) {

            var nw = bounds.getNorthWest(),
                se = bounds.getSouthEast(),
                zone,
                xmin = nw.lng,
                xmax = se.lng,
                ymin = se.lat,
                ymax = nw.lat,
                zoom = G3ME.map.getZoom(),
                request = " SELECT *,";
            request += " CASE WHEN geometry LIKE '%Point%' THEN 1 WHEN geometry LIKE '%LineString%' THEN 2 END AS priority ";
            request += " FROM ASSETS WHERE NOT ( xmax < ? OR xmin > ? OR ymax < ? OR ymin > ?) ";
            request += " AND ( (minzoom <= 1*? OR minzoom = 'null') AND ( maxzoom >= 1*? OR maxzoom = 'null') )";

            for (var i = 0, length_ = Site.current.zones.length; i < length_; i++) {
                if (G3ME.extents_match( Site.current.zones[i].extent, {
                        xmin: xmin,
                        xmax: xmax,
                        ymin: ymin,
                        ymax: ymax
                    } )) {
                    zone = Site.current.zones[i];
                    break;
                }
            }

            if (!zone || (G3ME.active_layers && !G3ME.active_layers.length)) {
                return callback( [] );
            } else if (G3ME.active_layers) {
                request += " and ( symbolId REGEXP '" + G3ME.active_layers.join( "[0-9]+' OR symbolId REGEXP '" ) + "[0-9]+' )";
            }
            request += " order by priority LIMIT 0,100 ";
            SQLite.exec( zone.database_name, request, [xmin, xmax, ymin, ymax, zoom, zoom], function(rows) {
                var assets = [];
                for (var i = 0, numRows = rows.length; i < numRows && assets.length < 10; i++) {
                    var asset = new Asset( Asset.convertRawRow( rows.item( i ) ), $.noop, true );
                    if (asset.intersectsWithCircle( center, 40 )) {
                        assets.push( asset );
                    }
                }
                // Bug de tri arrangé, voir si cela est suffisant ou pas
                if (assets[0] && (!isNaN( parseFloat( assets[0].label ) ) && isFinite( assets[0].label ))) {
                    assets.sort( function(a, b) {
                        return (parseFloat( a.label ) < parseFloat( b.label )) ? -1 : 1;
                    } );
                } else {
                    assets.sort( function(a, b) {
                        if (a.label.toLowerCase() < b.label.toLowerCase()) {
                            return -1;
                        }
                        if (a.label.toLowerCase() > b.label.toLowerCase()) {
                            return 1;
                        }
                        return 0;
                    } );
                }
                return callback( assets );
            } );
        };

        Asset.prototype.intersectsWithCircle = function(center, radius) {
            if (this.geometry.type === "LineString") {
                var p1 = G3ME.map.latLngToContainerPoint( [center.lng, center.lat] ),
                    p2, p3, distanceToCenter;
                for (var j = 0, length_ = this.geometry.coordinates.length; j < (length_ - 1); j++) {
                    p2 = j ? p3 : G3ME.map.latLngToContainerPoint( this.geometry.coordinates[j] );
                    p3 = G3ME.map.latLngToContainerPoint( this.geometry.coordinates[j + 1] );
                    distanceToCenter = L.LineUtil.pointToSegmentDistance( p1, p2, p3 );
                    if (distanceToCenter <= radius) {
                        return true;
                    }
                }
                return false;
            } else {
                return true;
            }
        };

        Asset.prototype.getLabel = function() {
            return this.label || this.okey && Site.current.metamodel[this.okey] && this.attributes[Site.current.metamodel[this.okey].ukey] && this.attributes[Site.current.metamodel[this.okey].ukey].length ? this.attributes[Site.current.metamodel[this.okey].ukey] : (Site.current.metamodel[this.okey] && Site.current.metamodel[this.okey].label) || "";
        };

        Asset.findAssetsByGuids = function(guids, callback, zones, partial_response) {
            var guidsbis = [], i, response, tmp;

            if (!zones) {
                zones = Site.current.zones;
                partial_response = [];
            }
            if (!zones || !zones.length || guids.length === 0 || window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
                response = [];
                tmp = {};
                for (var j = 0, jj = partial_response.length; j < jj; j++) {
                    if (tmp[partial_response[j].id]) {
                        continue;
                    } else {
                        tmp[partial_response[j].id] = true;
                        response.push( partial_response[j] );
                    }
                }
                return callback( response );
            }
            if (!(guids instanceof Array)) {
                guids = [guids];
            }
            guids = guids.map( String );
            guidsbis = angular.copy( guids );
            for (i = 0; i < guidsbis.length; i++) {
                if (Asset.cache[guidsbis[i]]) {
                    partial_response.push( angular.copy( Asset.cache[guidsbis[i]] ) );
                    guids.splice( guids.indexOf( guidsbis[i] ), 1 );
                }
            }
            if (guids.length === 0) {
                response = [];
                tmp = {};
                for (var k = 0, kk = partial_response.length; k < kk; k++) {
                    if (tmp[partial_response[k].id]) {
                        continue;
                    } else {
                        tmp[partial_response[k].id] = true;
                        response.push( partial_response[k] );
                    }
                }
                return callback( response );
            }
            SQLite.exec( zones[0].database_name, 'SELECT * FROM ASSETS WHERE id in ( ' + guids.join( ',' ).replace( /[a-z0-9|-]+/gi, '?' ) + ')', guids, function(results) {
                for (var i = 0; i < results.length; i++) {
                    var tmp = new Asset( Asset.convertRawRow( results.item( i ) ) );
                    Asset.cache[tmp.id] = tmp;
                    partial_response.push( angular.copy( Asset.cache[tmp.id] ) );
                }
                Asset.findAssetsByGuids( guids, callback, zones.slice( 1 ), partial_response );
            } );
        };

        Asset.prototype.duplicate = function(callback, project) {
            var asset = this;
            Relationship.findRelated( asset.guid, function(root, tree) {
                var guids = Object.keys( tree );
                Asset.findAssetsByGuids( guids, function(assets) {
                    var trad = {},
                        duplicates = [];

                    for (var i = 0; i < assets.length; i++) {
                        var newAsset = new Asset( angular.copy( assets[i] ) ),
                            _uuid = newAsset.id + '|' + window.uuid();

                        trad[newAsset.guid] = _uuid;

                        newAsset.guid = _uuid;
                        newAsset.id = _uuid;

                        newAsset.attributes = newAsset.attributes || {};
                        newAsset.attributes._original = assets[i].guid;

                        if (project) {
                            newAsset.okey = "PROJECT_" + assets[i].okey;
                            newAsset.symbolId = "PROJECT_" + assets[i].okey + project.getClassIndexForUnchangedAsset( assets[i].okey );
                        }

                        newAsset.bounds = {
                            sw: {
                                lat: newAsset.ymin,
                                lng: newAsset.xmin
                            },
                            ne: {
                                lat: newAsset.ymax,
                                lng: newAsset.xmax
                            }
                        };

                        duplicates.push( newAsset );
                    }

                    var relationships = {};

                    for (var idfather in tree) {
                        relationships[trad[idfather]] = [];
                        for (i = 0; i < tree[idfather].length; i++) {
                            relationships[trad[idfather]].push( trad[tree[idfather][i]] );
                        }
                    }

                    Asset.save( duplicates );

                    Relationship.save( relationships );
                    callback( duplicates, relationships );
                } );
            } );
        };

        Asset.getAllProjectAsset = function(project, callback, zones, partial_response) {
            if (!zones) {
                zones = Site.current.zones;
                partial_response = [];
            }

            if (!zones.length) {
                return callback( partial_response );
            }

            var request = 'SELECT * FROM ASSETS WHERE symbolId like "PROJECT_%" OR asset like "%PROJECT_%" ';
            if (project.added.length) {
                request += 'OR id in ("' + project.added.join( '","' ) + '")';
            }
            SQLite.exec( zones[0].database_name, request, [], function(results) {
                for (var i = 0; i < results.length; i++) {
                    var tmp = new Asset( Asset.convertRawRow( results.item( i ) ) );
                    Asset.cache[tmp.id] = tmp;
                    partial_response.push( angular.copy( Asset.cache[tmp.id] ) );
                }
                Asset.getAllProjectAsset( project, callback, zones.slice( 1 ), partial_response );
            } );
        };

        Asset.deleteAllProjectAsset = function(callback, zones) {

            if (!zones) {
                zones = Site.current.zones;
            }
            if (!zones.length) {
                return (callback || function() {})();
            }

            var request = 'DELETE FROM ASSETS WHERE symbolId like "PROJECT_%" OR asset like "%PROJECT_%"';
            SQLite.exec( zones[0].database_name, request, [], function() {
                Asset.deleteAllProjectAsset( callback, zones.slice( 1 ) );
            } );
        };

        /**
         * @name delete
         * @desc Supprime les objets Asset en base de données correspondant au guids passé en paramètre.
         * @param {Number|Array} guids
         * @param {function} callback
         * @param {Array} zones
         */
        Asset.delete = function(guids, callback, zones) {

            if (guids instanceof Array && guids.length === 0) {
                return (callback || function() {})();
            }
            // Il se peut qu'on passe des guids nuls
            // dans le cas d'un ajout d'objet enfant en modification
            for (var i = 0, l = guids.length; i < l; i++) {
                if (!guids[i]) {
                    guids.splice( i, 1 );
                }
            }

            if ((guids instanceof Asset || guids instanceof Object) && !guids.length) {
                guids = [guids.guid];
            } else if (guids.length && (guids[0] instanceof Asset || guids[0] instanceof Object)) {
                var guidsbis = [];
                for (var i = 0, ii = guids.length; i < ii; i++) {
                    var id = guids[i].id || guids[i].uuid;
                    if (id) {
                        guidsbis.push( id );
                    }
                }
                guids = guidsbis;
            }

            if (typeof guids !== "object") {
                guids = [guids];
            }

            if (!zones) {
                zones = Site.current.zones;
            }

            if (!zones.length || guids.length === 0) {
                return Relationship.delete( guids, function() {
                    return (callback || function() {})();
                } );
            }

            var request = 'DELETE FROM ASSETS WHERE id in (' + guids.join( ',' ).replace( /[a-z0-9|-]+/gi, '?' ) + ')';
            SQLite.exec( zones[0].database_name, request, guids.map( String ), function() {
                if (zones.length === 1) {
                    return (callback || function() {})();
                }
                Asset.delete( guids, callback, zones.slice( 1 ) );
            } );

        };

        /**
         * @name convertRawRow
         * @desc Converti un objet sortant de la base de données en objet exploitable
         * @param {Object} asset
         */
        Asset.convertRawRow = function(asset) {
            var a = angular.copy( asset ), parsed;
            try {
                parsed = a.asset ? JSON.parse( a.asset.replace( /&#039;/g, "'" ).replace( /\\\\/g, "\\" ) ) : a;
                return angular.extend( a, {
                    okey: parsed.okey,
                    attributes: parsed.attributes,
                    guid: a.id,
                    geometry: JSON.parse( a.geometry ),
                    asset: undefined,
                    label: a.label.replace( /&#039;/g, "'" ).replace( /\\\\/g, "\\" ),
                    project_status: parsed.project_status
                } );
            } catch ( e ) {
                return asset;
            }
        };

        Asset.prototype.toggleEdit = function() {
            $rootScope.showMenuItemById( "census" );
            $rootScope.$broadcast( "START_UPDATE_ASSET", this );
        };

        /**
         * @name handleDeleteAssets
         * @param  {Array} guids
         */
        Asset.handleDeleteAssets = function(data, callback) {
            if (!data || !data.deleted) {
                (callback || function() {})();
                return false;
            }

            var guids = ((+data.deleted === data.deleted) ? [data.deleted] : data.deleted) || [];

            for (var i = 0; i < guids.length; i++) {
                Relationship.findSubtree( guids[i], function(root, tree) {
                    var ids = Object.keys( tree );
                    Asset.delete( ids, function() {
                        $rootScope.$broadcast( "_REMOTE_DELETE_ASSETS_", ids );
                        G3ME.reloadLayers();
                    } );
                } );
            }
            (callback || function() {})();
            return true;
        };

        /**
         * @name __buildRequest
         * @desc
         * @param {Array} asset_s
         */
        Asset.__buildRequest = function(asset_s, site) {

            var assets = asset_s.length ? asset_s : [asset_s];

            site = site || Site.current;

            var request = '',
                asset, asset_, guid,
                metamodel = site.metamodel,
                symbology = site.symbology,
                bounds,
                fields_in_request = ['xmin', 'xmax', 'ymin', 'ymax', 'geometry', 'symbolId', 'angle', 'label', 'maplabel', 'minzoom', 'maxzoom', 'asset'],
                fields_to_delete = ['guids', 'bounds', 'geometry', 'classindex', 'angle'],
                values_in_request,
                i, j, k, symbolId, mySymbology,
                guids = [];

            for (i = 0; i < assets.length; i++) {
                asset = assets[i];
                delete asset.consultationMarker;
                delete asset.relatedAssets;
                asset_ = JSON.parse( JSON.stringify( asset ) );
                guid = asset.guid + "";
                bounds = asset.bounds;
                request += (request === '' ? "INSERT INTO ASSETS SELECT " : " UNION SELECT ") + " ? as id ";
                symbolId = asset.symbolId || ("" + asset.okey + asset.classindex);
                mySymbology = symbology[symbolId];
                if (!mySymbology) {
                    symbolId = symbolId.replace( 'PROJECT_', '' );
                    symbolId = symbolId.replace( 'undefined', '' );
                    mySymbology = symbology[symbolId];
                    if (!mySymbology) {
                        mySymbology = {
                            minzoom: asset.minzoom,
                            maxzoom: asset.maxzoom
                        };
                    }
                }

                for (k = 0; k < fields_to_delete.length; k++) {
                    delete asset_[fields_to_delete[k]];
                }

                guids.push( guid );

                values_in_request = [
                    bounds.sw.lng, bounds.ne.lng, bounds.sw.lat, bounds.ne.lat,
                    JSON.stringify( asset.geometry ), symbolId, (asset.angle || ""), ('' + (asset.attributes[(metamodel[asset.okey] || metamodel[asset.okey.replace( 'PROJECT_', '' )]).ukey] || "")),
                    asset.maplabel || '',
                    +mySymbology.minzoom,
                    +mySymbology.maxzoom,
                    JSON.stringify( asset_ )
                ];

                for (j = 0; j < fields_in_request.length; j++) {
                    request += ' , \'' + ((typeof values_in_request[j] === 'string' && values_in_request[j].length) || typeof values_in_request[j] !== 'string' ? JSON.stringify( values_in_request[j] ) : '').replace( /^"(.+)"$/, '$1' ).replace( /\\"/g, '"' ).replace( /'/g, '&#039;' ) + '\' as ' + fields_in_request[j];
                }

                if (assets[i]) {
                    delete assets[i];
                }
            }
            return {
                request: ((request !== '') ? request : 'SELECT 1'),
                args: guids
            };
        };

        /**
         * @name __distributeAssetsInZone
         * @desc
         * @param {Array} asset_s
         */
        Asset.__distributeAssetsInZone = function(asset_s, site) {
            var assets = asset_s.length ? asset_s : [asset_s];

            site = site || Site.current;

            if (!assets) {
                return false;
            }

            var asset, bounds, asset_extent,
                zones = angular.copy( site.zones );

            for (var i = 0; i < assets.length; i++) {
                asset = assets[i];
                if (!asset) {
                    continue;
                }
                bounds = asset.bounds;
                if (bounds) {
                    asset_extent = {
                        xmin: bounds.sw.lng,
                        xmax: bounds.ne.lng,
                        ymin: bounds.sw.lat,
                        ymax: bounds.ne.lat
                    };
                } else {

                    continue;
                }

                for (var j = 0, zones_length = zones.length; j < zones_length; j++) {
                    if (G3ME.extents_match( zones[j].extent, asset_extent )) {
                        zones[j].assets.push( asset );
                    }
                }
            }

            return zones;
        };

        /**
         * @method
         * @memberOf Asset
         */
        Asset.save = function(asset, callback, site) {
            site = site || Site.current;
            var zones = Asset.__distributeAssetsInZone( asset, site );
            var uuidcallback = window.uuid();
            Asset.checkpointCallbackRegister( uuidcallback, zones.length, callback );
            for (var i = 0; i < zones.length; i++) {
                var zone = zones[i];
                if (!zone.assets.length) {
                    Asset.checkpointCallback( uuidcallback );
                    continue;
                }
                var request = Asset.__buildRequest( zone.assets, site );
                SQLite.exec( zone.database_name, request.request, request.args, function() {
                    Asset.checkpointCallback( uuidcallback );
                }, function(tx, sqlerror) {
                    console.error( sqlerror.message );
                } );
            }
        };

        Asset.checkpointCallbackId = {};

        Asset.checkpointCallback = function(uuid) {
            if (Asset.checkpointCallbackId[uuid].count <= 1) {
                (Asset.checkpointCallbackId[uuid].callback || function() {})();
                delete Asset.checkpointCallbackId[uuid];
            } else {
                Asset.checkpointCallbackId[uuid].count--;
            }
        };

        Asset.checkpointCallbackRegister = function(uuid, count, callback) {
            Asset.checkpointCallbackId[uuid] = {
                count: count,
                callback: callback
            };
        };

        Asset.findGeometryByGuids = function(guids, callback, zones, partial_response) {
            if (guids.length > Asset.__maxIdPerRequest) {
                return Asset.findGeometryByGuids_big( guids, callback );
            }

            if (!zones) {
                zones = Site.current.zones;
                partial_response = [];
            }

            if (!zones || !zones.length) {
                return callback( partial_response );
            }
            if (typeof guids !== 'object') {
                guids = [guids];
            }

            if (guids.length === 0) {
                return callback( [] );
            }

            SQLite.exec( zones[0].database_name, 'SELECT * FROM ASSETS WHERE id in ( ' + guids.join( ',' ).replace( /[a-z0-9|-]+/gi, '?' ) + ')', guids.map( String ), function(rows) {
                var asset;
                for (var i = 0; i < rows.length; i++) {
                    asset = rows.item( i );
                    partial_response.push( {
                        guid: asset.id,
                        label: asset.label,
                        geometry: JSON.parse( asset.geometry ),
                        xmin: asset.xmin,
                        xmax: asset.xmax,
                        ymin: asset.ymin,
                        ymax: asset.ymax
                    } );
                }
                Asset.findGeometryByGuids( guids, callback, zones.slice( 1 ), partial_response );
            } );
        };

        Asset.findGeometryByGuids_big = function(guids, callback, partial_response) {
            partial_response = partial_response || [];
            if (guids.length === 0) {
                return callback( partial_response );
            } else {
                Asset.findGeometryByGuids( guids.slice( 0, Asset.__maxIdPerRequest ), function(assets) {
                    Asset.findGeometryByGuids_big( guids.slice( Asset.__maxIdPerRequest ), callback, partial_response.concat( assets ) );
                } );
            }
        };

        Asset.findExtentByGuids = function(guids, callback, zones, partial_response) {
            if (guids.length > Asset.__maxIdPerRequest) {
                return Asset.findExtentByGuids_big( guids, callback );
            }

            if (!zones) {
                zones = Site.current.zones;
                partial_response = [];
            }

            if (!zones || !zones.length) {
                return callback( partial_response );
            }
            if (typeof guids !== 'object') {
                guids = [guids];
            }

            if (guids.length === 0) {
                return callback( [] );
            }

            SQLite.exec( zones[0].database_name, 'SELECT min(xmin) as xmin, max(xmax) as xmax, min(ymin) as ymin, max(ymax) as ymax FROM ASSETS WHERE id in ( ' + guids.join( ',' ).replace( /[a-z0-9|-]+/gi, '?' ) + ')', guids.map( String ), function(rows) {
                partial_response.push( rows.item( 0 ) );
                Asset.findExtentByGuids( guids, callback, zones.slice( 1 ), partial_response );
            } );
        };

        Asset.findExtentByGuids_big = function(guids, callback, partial_response) {
            partial_response = partial_response || [];
            if (guids.length === 0) {
                return callback( partial_response );
            } else {
                Asset.findExtentByGuids( guids.slice( 0, Asset.__maxIdPerRequest ), function(assets) {
                    Asset.findExtentByGuids_big( guids.slice( Asset.__maxIdPerRequest ), callback, partial_response.concat( assets ) );
                } );
            }
        };


        Asset.findAssetsByLabel = function(label, callback, zones, partial_response) {
            if (!zones) {
                zones = Site.current.zones;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
                return callback( [] );
            }

            if (!zones.length) {
                partial_response.sort( function(a, b) {
                    return (a.label < b.label) ? -1 : 1;
                } );
                return callback( partial_response );
            }

            SQLite.exec( zones[0].database_name, 'SELECT * FROM ASSETS WHERE label like ? limit 0, 10', ["%" + label + "%"], function(rows) {
                for (var i = 0; i < rows.length; i++) {
                    var asset = angular.copy( rows.item( i ) );
                    asset.label = asset.label.replace( /&#039;/g, "'" ).replace( /\\\\/g, "\\" );
                    asset.okey = Asset.sanitizeAsset( asset.asset ).okey;
                    partial_response.push( asset );
                }
                Asset.findAssetsByLabel( label, callback, zones.slice( 1 ), partial_response );
            } );

        };

        Asset.findAssetsByCriteria = function(search, callback, zones, partial_response, request) {
            if (!zones) {
                zones = Site.current.zones;
                partial_response = [];
                console.time( 'Recherche' );
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
                return callback( [] );
            }
            if (!zones.length || partial_response.length >= Asset.__maxResultPerSearch) {
                console.timeEnd( 'Recherche' );
                // Bug de tri arrangé, voir si cela est suffisant ou pas
                if (partial_response[0] && (!isNaN( parseFloat( partial_response[0].label ) ) && isFinite( partial_response[0].label ))) {
                    partial_response.sort( function(a, b) {
                        return (parseFloat( a.label ) < parseFloat( b.label )) ? -1 : 1;
                    } );
                } else {
                    partial_response.sort( function(a, b) {
                        if (a.label.toLowerCase() < b.label.toLowerCase()) {
                            return -1;
                        }
                        if (a.label.toLowerCase() > b.label.toLowerCase()) {
                            return 1;
                        }
                        return 0;
                    } );
                }
                return callback( partial_response );
            }

            if (!request) {
                request = "SELECT * FROM assets WHERE symbolId REGEXP('" + search.okey + "[0-9]+') ";
                var regex;
                for (var criter in search.criteria) {
                    if (search.criteria.hasOwnProperty( criter ) && search.criteria[criter]) {
                        if (!isNaN( search.criteria[criter] )) {
                            regex = '.*\"' + criter.toString().toLowerCase() + '\":' + search.criteria[criter].toString().toLowerCase() + '[(,)|(\\)|(\})].*';
                            request += "AND (LOWER(asset) REGEXP('" + regex + "')) ";
                        } else {
                            regex = '.*\"' + criter.toString().toLowerCase() + '\":\"' + search.criteria[criter].toString().toLowerCase().replace( '(', '\\\(' ).replace( ')', '\\\)' ) + '\".*';
                            request += "AND (LOWER(asset) REGEXP('" + regex + "')) ";
                        }
                    }
                }
                request += 'LIMIT ' + (Asset.__maxResultPerSearch - partial_response.length);
            }
            SQLite.exec( zones[0].database_name, request, [], function(rows) {
                for (var i = 0; i < rows.length; i++) {
                    var asset = rows.item( i );
                    try {
                        asset.okey = Asset.sanitizeAsset( asset.asset ).okey;
                    } catch ( e ) {}
                    partial_response.push( asset );
                }
                Asset.findAssetsByCriteria( search, callback, zones.slice( 1 ), partial_response, request );
            } );
        };

        /**
         * @memberOf Smartgeo
         * @param {string} asset serialized asset
         * @returns {Object} Satitized parsed asset
         * @desc Sanitize asset eg. replace horrible characters
         */
        Asset.sanitizeAsset = function(asset) {
            return JSON.parse( asset.replace( /&#039;/g, "'" ).replace( /\\\\/g, "\\" ) );
        };

        /**
         * @name getIds
         * @desc
         */
        Asset.getIds = function(complex, ids) {
            ids = ids || [];

            complex.children = complex.children || [];

            ids.push( complex.id );

            for (var i = 0, ii = complex.children.length; i < ii; i++) {
                Asset.getIds( complex.children[i], ids );
            }

            return ids;
        };

        /**
         * @name update
         * @desc
         * @param {Number|Array} guids
         * @param {function} callback
         */
        Asset.update = function(asset, callback) {
            Asset.delete( asset, function() {
                Asset.save( asset, callback );
            } );
        };

        Asset.emptyCache = function(ids) {
            if (!ids.length) {
                delete Asset.cache;
                return;
            }
            for (var i in ids) {
                delete Asset.cache[ids[i]];
            }
        };

        Asset.lock = function(guids) {
            Storage.set( 'locked_assets', guids );
        };

        Asset.prototype.lock = function() {
            var _this = this;

            Relationship.findRelated( _this.guid, function(root, tree) {
                var locked = Storage.get( 'locked_assets' ),
                    guids = Object.keys( tree );

                guids.map( function(guid) {
                    guid = +guid;
                    if (locked.indexOf( guid ) === -1) {
                        locked.push( guid );
                    }
                } );

                Asset.lock( locked );
            } );
        };

        return Asset;
    }

} )();
