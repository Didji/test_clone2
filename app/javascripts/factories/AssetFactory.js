angular.module('smartgeomobile').factory('AssetFactory', function ($http, Smartgeo, $q, $rootScope, Installer, G3ME, SQLite) {

    'use strict';

    /**
     * @class AssetError
     */
    function AssetError(message) {
        this.name = "AssetError";
        this.message = message || "Unhandled AssetError";
    }
    AssetError.prototype = new Error();
    AssetError.prototype.constructor = AssetError;


    /**
     * @class Asset
     */
    var Asset = function(asset){
        return this;
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.save = function(asset, site) {
        var zones = Asset.__distributeAssetsInZone(asset, site);
        for (var i = 0; i < zones.length; i++) {
            var zone = zones[i] ;
            if(!zone.assets.length){
                continue;
            }
            var request = Asset.__buildRequest(zone.assets, site) ;

            SQLite.openDatabase({
                name: zone.database_name
            }).transaction(function (transaction) {
                transaction.executeSql(request.request, request.args, function () {
                }, function (tx, sqlerror) {
                    console.log(sqlerror.message);
                });
            });
        }
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.__buildRequest = function(asset_s, site) {

        var assets = asset_s.length ? asset_s : [asset_s];

        var request = '',
            asset, asset_, guid, check = /\'/g,
            metamodel = site.metamodel,
            symbology = site.symbology,
            bounds, geometry, symbolId, angle, label, args = [],
            fields_in_request = ['xmin', 'xmax', 'ymin', 'ymax', 'geometry', 'symbolId', 'angle', 'label', 'maplabel', 'minzoom', 'maxzoom', 'asset'],
            fields_to_delete = ['guids', 'bounds', 'geometry', 'classindex', 'angle'],
            values_in_request,
            i, j, k;

        for (i = 0; i < assets.length; i++) {
            asset = assets[i];
            asset_ = JSON.parse(JSON.stringify(asset));
            guid = asset.guid;
            bounds = asset.bounds;
            request += (request === '' ? "INSERT INTO ASSETS SELECT " : " UNION SELECT ") + " " + guid + " as id ";

            for (k = 0; k < fields_to_delete.length; k++) {
                delete asset_[fields_to_delete[k]];
            }

            values_in_request = [
                bounds.sw.lng, bounds.ne.lng, bounds.sw.lat, bounds.ne.lat,
                JSON.stringify(asset.geometry), ("" + asset.okey + asset.classindex), (asset.angle || ""), ('' + (asset.attributes[metamodel[asset.okey].ukey] || "")),
                asset.maplabel || '',
                1 * symbology[("" + asset.okey + asset.classindex)].minzoom,
                1 * symbology[("" + asset.okey + asset.classindex)].maxzoom,
                JSON.stringify(asset_)
            ];

            for (j = 0; j < fields_in_request.length; j++) {
                request += ' , \'' + ((typeof values_in_request[j] === 'string' && values_in_request[j].length) || typeof values_in_request[j] !== 'string' ? JSON.stringify(values_in_request[j]) : '').replace(/^"(.+)"$/, '$1').replace(/\\"/g, '"').replace(/'/g, '&#039;') + '\' as ' + fields_in_request[j];
            }

            if (assets[i]) {
                delete assets[i];
            }
        }
        return {
            request: ((request !== '') ? request : 'SELECT 1'),
            args: []
        };
    };

    Asset.__distributeAssetsInZone = function(asset_s, site) {

        var assets = asset_s.length ? asset_s : [asset_s];

        if (!assets) {
            return false;
        }

        var asset, bounds, asset_extent, zones = angular.copy(site.zones);

        for (var i = 0; i < assets.length; i++) {
            asset = assets[i];
            if (!asset || !asset.bounds) {
                continue;
            }
            bounds = asset.bounds;
            asset_extent = {
                xmin: bounds.sw.lng,
                xmax: bounds.ne.lng,
                ymin: bounds.sw.lat,
                ymax: bounds.ne.lat
            };
            for (var j = 0, zones_length = zones.length; j < zones_length; j++) {
                if (G3ME.extents_match(zones[j].extent, asset_extent)) {
                    zones[j].assets.push(asset);
                }
            }
        }

        return zones ;
    };


    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__log = function() { }

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__clone = function() {}

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__clean = function() {}

    return Asset;
});
