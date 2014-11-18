angular.module('smartgeomobile').factory('AssetFactory', function($http, Smartgeo, $q, $rootScope, Installer, G3ME, SQLite) {

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
    var Asset = function(asset) {
        return this;
    };


    /**
     * @memberOf Asset
     * @desc Mutex
     */
    Asset.m = {
        f: false,
        take: function() {
            var t = this.f ;
            this.f = true; return !t;
        },
        release: function() {
            this.f = false;
        },
        getTime: function() {
            return Math.random() * (this.m_max_t - this.m_min_t) + this.m_min_t;
        },
        m_max_t: 5000,
        m_min_t: 1000
    }

    /**
     * @memberOf Asset
     */
    Asset.synchronizeTimeout = 60000 ;

    /**
     * @method
     * @memberOf Asset
     */
    Asset.synchronize = function(asset, callback, timeout) {

        if (typeof asset === "string") {
            return Asset.getByUUID(asset, function(asset) {
                Asset.synchronize(asset, callback, timeout);
            });
        }

        if (!Asset.m.take()) {
            return Smartgeo.sleep(Asset.m.getTime(), function() {
                Asset.synchronize(asset, callback, timeout);
            });
        }

        asset.syncInProgress = true ;

        $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.census.json'), asset, {
            timeout: timeout || Asset.synchronizeTimeout
        }).success(function(data) {
            for (var okey in data) {
                if (window.SMARTGEO_CURRENT_SITE.metamodel[okey]) {
                    asset.synced = true ;
                    asset.error = undefined ;
                    Asset.__updateMapLayers();
                    return;
                }
            }
            Asset.synchronizeErrorCallback(data, false, asset);
        }).error(function(data, code) {
            Asset.synchronizeErrorCallback(data, code, asset);
        }).finally(function() {
            Asset.m.release();
            Asset.log(asset);
            asset.syncInProgress = false ;
            Asset.addToDatabase(asset, callback || function() {});
        });

    };

    Asset.synchronizeErrorCallback = function(data, code, asset) {
        if (code) {
            asset.error = (data && data.error && data.error.text) || "Erreur inconnue lors de la synchronisation de l'objet.";
        } else {
            asset.error = "Erreur réseau.";
        }
    };


    /**
     * @method
     * @memberOf Asset
     */
    Asset.checkSynchronizedAssets = function() {

        Asset.getAll(function(assets) {

            var luuids = [];

            for (var i = 0; i < assets.length; i++) {
                if (assets[i].synced) {
                    luuids.push(assets[i].uuid);
                }
            }

            $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.census.check.json'), {
                uuids: luuids
            })
                .success(function(data) {
                    var ruuids = data.uuids || data ;
                    for (var uuid in ruuids) {
                        if (ruuids[uuid]) {
                            console.warn(uuid + ' must be deleted');
                            Asset.deleteInDatabase(uuid);
                        } else {
                            console.warn(uuid + ' must be resync');
                            Asset.synchronize(uuid);
                        }
                    }
                });
        });
    };


    /**
     * @method
     * @memberOf Asset
     */
    Asset.log = function(asset) {
        asset = angular.copy(asset);
        delete asset.ged
        ;
        if (window.SmartgeoChromium && window.SmartgeoChromium.writeJSON) {
            ChromiumCallbacks[11] = function(success) {
                if (!success) {
                    console.error("writeJSONError while writing " + 'assets/' + asset.uuid + '.json');
                }
            };
            SmartgeoChromium.writeJSON(JSON.stringify(asset), 'assets/' + asset.uuid + '.json');
        }
        return this;
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.getByUUID = function(uuid, callback) {
        if (!Asset.m.take()) {
            return Smartgeo.sleep(Asset.m.getTime(), function() {
                Asset.getByUUID(uuid, callback);
            });
        }

        Smartgeo.get_('census', function(assets) {
            Asset.m.release();
            assets = assets || [];
            var asset;
            for (var i = 0; i < assets.length; i++) {
                if (assets[i].uuid !== uuid) {
                    continue ;
                } else {
                    asset = assets[i] ;
                    break ;
                }
            }
            if (!asset) {
                console.error('AssetFactory->getByUUID(' + uuid + ') : UUID NOT FOUND IN DATABASE');
            }
            (callback || function() {})(asset);
        });

    };


    /**
     * @method
     * @memberOf Asset
     */
    Asset.getAll = function(callback) {
        if (!Asset.m.take()) {
            return Smartgeo.sleep(Asset.m.getTime(), function() {
                Asset.getAll(callback);
            });
        }
        callback = callback || function() {};
        Smartgeo.get_('census', function(assets) {
            Asset.m.release();
            callback(assets || []);
        });
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.addToDatabase = function(asset, callback) {
        if (!Asset.m.take()) {
            return Smartgeo.sleep(Asset.m.getTime(), function() {
                Asset.addToDatabase(asset, callback);
            });
        }
        callback = callback || function() {};
        Smartgeo.get_('census', function(assets) {
            assets = assets || [] ;
            for (var i = 0; i < assets.length; i++) {
                if (assets[i].uuid === asset.uuid) {
                    Asset.m.release();
                    return Asset.updateInDatabase(asset, callback);
                }
            }
            assets.push(asset);
            Smartgeo.set_('census', assets, function() {
                Asset.m.release();
                callback(asset);
            });
        });
    },


    /**
     * @method
     * @memberOf Asset
     */
    Asset.updateInDatabase = function(asset, callback) {
        if (!Asset.m.take()) {
            return Smartgeo.sleep(Asset.m.getTime(), function() {
                Asset.updateInDatabase(asset, callback);
            });
        }
        callback = callback || function() {};
        Smartgeo.get_('census', function(assets) {
            for (var i = 0; i < assets.length; i++) {
                if (assets[i].uuid === asset.uuid) {
                    assets[i] = asset ;
                    return Smartgeo.set_('census', assets, function() {
                        Asset.m.release();
                        callback(asset);
                    });
                }
            }
            Asset.m.release();
            return Asset.addToDatabase(asset, callback);
        });
    };


    /**
     * @method
     * @memberOf Asset
     */
    Asset.deleteInDatabase = function(asset, callback) {

        if (typeof asset === "string") {
            return Asset.getByUUID(asset, function(asset) {
                Asset.deleteInDatabase(asset, callback);
            });
        }

        if (!Asset.m.take()) {
            return Smartgeo.sleep(Asset.m.getTime(), function() {
                Asset.deleteInDatabase(asset, callback);
            });
        }

        callback = callback || function() {};

        Smartgeo.get_('census', function(assets) {
            assets = assets || [];
            for (var i = 0; i < assets.length; i++) {
                if (assets[i].uuid === asset.uuid) {
                    assets.splice(i, 1);
                    return Smartgeo.set_('census', assets, function() {
                        Asset.m.release();
                        Asset.__updateMapLayers();
                        callback();
                    });
                }
            }
            console.error('AssetFactory->deleteInDatabase(' + asset.uuid + ') : UUID NOT FOUND IN DATABASE');
            callback(undefined);
        });
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.save = function(asset, site) {
        var zones = Asset.__distributeAssetsInZone(asset, site);
        for (var i = 0; i < zones.length; i++) {
            var zone = zones[i] ;
            if (!zone.assets.length) {
                continue;
            }
            var request = Asset.__buildRequest(zone.assets, site);

            SQLite.openDatabase({
                name: zone.database_name
            }).transaction(function(transaction) {
                transaction.executeSql(request.request, request.args, function() {}, function(tx, sqlerror) {
                    console.error(sqlerror.message);
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
            asset, asset_, guid,
            check = /\'/g,
            metamodel = site.metamodel,
            symbology = site.symbology,
            bounds, geometry, symbolId, angle, label,
            args = [],
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

        var asset, bounds, asset_extent,
            zones = angular.copy(site.zones);

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

        return zones;
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.__updateMapLayers = function() {
        for (var i in G3ME.map._layers) {
            if (G3ME.map._layers[i].redraw && !G3ME.map._layers[i]._url) {
                G3ME.map._layers[i].redraw();
            }
        }
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.fetchAssetsHistory = function(asset, callback) {
        $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.history', {
            id: asset.guid,
            limit: 5
        })).success(function(data) {
            callback(data);
        }).error(function() {
            console.error(arguments)
        });

        // callback([{
        //         "id" : 1235459,
        //         "assets": 1114562,
        //         "fields": {"1":"2014-06-27","2":"0:0","3":"ddd","387":"Pipouyou","388":"Je suis une constante","389":{},"390":"ddd","391":"Y","392":"ddd","397":"3","398":"Y","399":"ddd","400":12,"401":"3:1","404":{},"405":{}},
        //         "activity": 15,
        //         "timestamp": 1403852654621
        //     },{
        //         "id" : 1235455,
        //         "assets": 1114562,
        //         "fields": {"1":"2014-06-27","2":"0:0","3":"ddd","387":"Pipouyou","388":"Je suis une constante","389":{},"390":"ddd","391":"Y","392":"ddd","397":"3","398":"Y","399":"ddd","400":12,"401":"3:1","404":{},"405":{}},
        //         "activity": 15,
        //         "timestamp": 1303852754621
        //     },{
        //         "id" : 1235455,
        //         "assets": 1114562,
        //         "fields": {"1":"2014-06-27","2":"0:0","3":"ddd","387":"Pipouyou","388":"Je suis une constante","389":{},"390":"ddd","391":"Y","392":"ddd","397":"3","398":"Y","399":"ddd","400":12,"401":"3:1","404":{},"405":{}},
        //         "activity": 15,
        //         "timestamp": 1413852754621
        //     },{
        //         "id" : 1235455,
        //         "assets": 1114562,
        //         "fields": {
        //             "1": "2014-06-28",
        //             "2": "0:01",
        //         },
        //         "activity": 15,
        //         "timestamp": 1403352754621
        //     },{
        //         "id" : 1235455,
        //         "assets": 1114562,
        //         "fields": {
        //             "1": "2014-06-28",
        //             "2": "0:01",
        //         },
        //         "activity": 15,
        //         "timestamp": 1403852554621
        //     }
        // ]);
    };

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__log = function() {};

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__clone = function() {};

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__clean = function() {};

    return Asset;
});
