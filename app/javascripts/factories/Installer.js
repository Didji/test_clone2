angular.module('smartgeomobile').factory('Installer', function (SQLite, Smartgeo, G3ME, $http, $rootScope, $browser, $timeout, $route) {

    'use strict';

    var Installer = {

        _LAST_ID_OKEY: {},

        // INSTALLATION CONSTANTS
        _INSTALL_MAX_ASSETS_PER_HTTP_REQUEST: 1000,
        _INSTALL_MAX_ASSETS_PER_ZONE: 4096,
        _INSTALL_MAX_ASSETS_PER_INSERT_REQUEST: 500,
        _INSTALL_MAX_ASSETS_PER_DELETE_REQUEST: 999,
        _INSTALL_MAX_ZONES_MATRIX_LENGTH: 4,

        deleteAssets: function (site, obsoletes, callback) {
            var assets = [];
            for (var okey in obsoletes) {
                if (obsoletes.hasOwnProperty(okey)) {
                    assets = assets.concat(obsoletes[okey]);
                }
            }

            if (assets.length <= 0) {
                callback();
            } else {
                var request = " DELETE FROM ASSETS WHERE id in ( " + assets.join(",") + " ) ";
                for (var i = 0; i < site.zones.length; i++) {
                    SQLite.openDatabase({
                        name: site.zones[i].database_name
                    }).transaction(function (transaction) {
                        transaction.executeSql(request, [], function () {
                            Installer.checkpoint("_remove_assets_", site.zones.length, callback);
                        });
                    });
                }
            }
        },

        formatSiteMetadata: function (site, update) {

            var metamodel = {},
                lists = {},
                symbology = {},
                activities = [],
                stats = [],
                i = 0;

            for (i = 0; i < site.metamodel.length; i++) {
                if (update || site.number[site.metamodel[i].okey] !== 0) {
                    metamodel[site.metamodel[i].okey] = site.metamodel[i];
                }
            }
            site.metamodel = metamodel;

            activities._byId = [];
            for (i = 0; i < site.activities.length; i++) {
                if (update || site.number[site.activities[i].okeys[0]] !== 0) {
                    activities.push(site.activities[i]);
                    activities._byId[site.activities[i].id] = site.activities[i];
                }
            }
            site.activities = activities;

            for (var key in site.lists) {
                if (site.lists.hasOwnProperty(key)) {
                    lists[key] = site.lists[key];
                }
            }
            site.lists = lists;

            for (i = 0; i < site.symbology.length; i++) {
                var symbolId = site.symbology[i].okey + '' + site.symbology[i].classindex + '';
                symbology[symbolId] = site.symbology[i];
            }
            site.symbology = symbology;

            for (var okey in site.number) {
                if (site.number.hasOwnProperty(okey) && okey !== 'total' && site.number[okey] !== 0 && site.number[okey] !== "0") {
                    stats.push({
                        'okey': okey,
                        'amount': site.number[okey]
                    });
                }
            }
            site.stats = stats;

            delete site.assets;

            return site;
        },

        getInstallJSON: function (site, callback) {
            var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.installation.json', {
                'site': site.id
            });

            $http.get(url)
                .success(callback)
                .error(function(response, code){
                    console.error(response, code);
                });
        },

        getUpdateJSON: function (site, callback) {
            var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.installation.json', {
                'site': site.id,
                'timestamp': site.timestamp
            });

            $http.get(url)
                .success(callback)
                .error(function(response, code){
                    if(code === 403){
                        Smartgeo.silentLogin(function(){
                            $route.reload() ;
                        });
                    }
                });
        },

        saveSite: function (site, callback) {
            Smartgeo.get_('sites', function(sites){
                sites = sites || {} ;
                delete site.number;
                delete site.obsoletes;
                delete site.stats;
                sites[site.id] = site;
                Smartgeo.set_('sites', sites, function(){
                    (callback || angular.noop)(sites);
                });
            });

        },

        createZones: function (site, callback) {

            var zones_matrix_length = Math.ceil(Math.sqrt(Math.pow(2, Math.ceil(Math.log(site.number.total / Installer._INSTALL_MAX_ASSETS_PER_ZONE) / Math.LN2))));
            zones_matrix_length = Math.min(zones_matrix_length, Installer._INSTALL_MAX_ZONES_MATRIX_LENGTH);
            var zones_matrix_width = (site.extent.xmax - site.extent.xmin) / zones_matrix_length,
                zones_matrix_height = (site.extent.ymax - site.extent.ymin) / zones_matrix_length,
                extent;

            site.zones = [];

            for (var i = 0; i < zones_matrix_length; i++) {
                for (var j = 0; j < zones_matrix_length; j++) {
                    extent = {
                        xmin: site.extent.xmin + i * zones_matrix_width,
                        xmax: site.extent.xmin + (i + 1) * zones_matrix_width,
                        ymin: site.extent.ymin + j * zones_matrix_height,
                        ymax: site.extent.ymin + (j + 1) * zones_matrix_height
                    };
                    site.zones.push({
                        extent: extent,
                        assets: [],
                        insert_requests: [],
                        table_name: JSON.stringify(extent).replace(/\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, ''),
                        database_name: JSON.stringify(extent).replace(/\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, '')
                    });
                }
            }

            for (i = 0; i < site.zones.length; i++) {
                SQLite.openDatabase({
                    name: site.zones[i].database_name
                }).transaction(function (transaction) {
                    transaction.executeSql('DROP TABLE IF EXISTS ASSETS');
                    transaction.executeSql('CREATE TABLE IF NOT EXISTS ASSETS (id, xmin real, xmax real, ymin real, ymax real, geometry, symbolId,  angle, label, maplabel, minzoom integer, maxzoom integer, asset)');
                    transaction.executeSql('CREATE INDEX IF NOT EXISTS IDX_ASSETS_ID ON ASSETS (id)');
                    transaction.executeSql('CREATE INDEX IF NOT EXISTS IDX_ASSETS ON ASSETS (xmin , xmax , ymin , ymax, symbolId , minzoom , maxzoom)', [], function () {
                        Installer.checkpoint("create_zones_databases_", site.zones.length, callback);
                    });
                });
            }

            return site;
        },

        checkpoint: function (attribute, treeshold, callback) {
            Installer[attribute] = 1 * (Installer[attribute] || 0) + 1;
            if (Installer[attribute] >= treeshold) {
                Installer[attribute] = 0;
                return callback();
            } else {
                return false;
            }
        },

        install: function (site, stats, callback, update) {

            if (!stats.length) {
                return callback();
            }

            Installer.installOkey(site, stats[0], function () {
                Installer.install(site, stats.slice(1), callback, update);
            }, update);

        },

        update: function (site, stats, callback) {
            var update = true;
            Installer.deleteAssets(site, site.obsoletes, function () {
                Installer.install(site, stats, callback, update);
            });
        },

        installOkey: function (site, objectType, callback, update) {

            $rootScope.$broadcast("_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", {
                okey: objectType.okey,
                progress: 0
            });

            if (objectType.amount === 0 || objectType.amount === "0") {
                return callback();
            }

            if (objectType.amount > Installer._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST) {
                Installer.installOkeyPerSlice(site, objectType, 0, callback, update);
            } else {
                var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.installation.assets.json', {
                    okey: objectType.okey
                });
                if (update) {
                    url += '&timestamp=' + site.oldTimestamp;
                }

                $http
                    .get(url)
                    .success(function (data) {
                        Installer.save(site, data.assets, function () {
                            $rootScope.$broadcast("_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", {
                                okey: objectType.okey,
                                progress: objectType.amount
                            });
                            $timeout(function () {
                                callback();
                            }, 100);
                        });
                    })
                    .error(function () {
                        $timeout(function () {
                            Installer.installOkey(site, objectType, callback, update);
                        }, 100);
                    });
            }
        },

        installOkeyPerSlice: function (site, objectType, lastFetched, callback, update) {
            if (lastFetched >= objectType.amount) {
                return callback();
            }
            var newlastFetched = lastFetched + Installer._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST,
                url = Smartgeo.get('url') + 'gi.maintenance.mobility.installation.assets.json';

            url += '&okey=' + objectType.okey;
            url += '&min=' + (lastFetched + 1);
            url += '&max=' + newlastFetched;

            if (update) {
                url += '&timestamp=' + site.oldTimestamp;
            }

            if (Installer._LAST_ID_OKEY[objectType.okey]) {
                url += '&lastid=' + Installer._LAST_ID_OKEY[objectType.okey];
            }

            $http
                .get(url)
                .success(function (data) {
                    if(!data.assets || !data.assets.length){
                        Installer.installOkeyPerSlice(site, objectType, newlastFetched, callback, update);
                        return ;
                    }
                    Installer._LAST_ID_OKEY[objectType.okey] = data.assets[data.assets.length - 1] ? data.assets[data.assets.length - 1].guid : Installer._LAST_ID_OKEY[objectType.okey];
                    Installer.save(site, data.assets, function () {
                        $rootScope.$broadcast("_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", {
                            okey: objectType.okey,
                            progress: Math.min(newlastFetched, objectType.amount)
                        });
                        $timeout(function () {
                            Installer.installOkeyPerSlice(site, objectType, newlastFetched, callback, update);
                        }, 100);
                    });
                }).error(function () {
                    $timeout(function () {
                        Installer.installOkeyPerSlice(site, objectType, lastFetched, callback, update);
                    }, 100);
                });
        },

        save: function (site, assets, callback) {
            Installer.distribute_assets_in_zones(site, assets);
            Installer.save_zones_to_database(site, function () {
                Installer.clean_zones(site);
                callback();
            });
        },

        clean_zones: function (site) {
            for (var i = 0; i < site.zones.length; i++) {
                if (site.zones[i].assets) {
                    site.zones[i].assets_count = (site.zones[i].assets_count || 0) + site.zones[i].assets.length;
                    site.zones[i].assets = [];
                    site.zones[i].insert_requests = [];
                }
            }
        },

        distribute_assets_in_zones: function (site, assets) {

            if (!assets) {
                return false;
            }

            var asset, bounds, asset_extent, zones = site.zones;

            for (var i = 0, assets_length = assets.length; i < assets_length; i++) {
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
        },

        save_zones_to_database: function (site, callback) {

            for (var i = 0; i < site.zones.length; i++) {
                (function (i) {
                    var temp_zone, sub_zone, zone = site.zones[i];
                    if (zone.assets) {
                        temp_zone = zone.assets;
                    } else {
                        return Installer.checkpoint("saved_zones", site.zones.length, callback);
                    }
                    while (temp_zone.length) {
                        sub_zone = temp_zone.slice(0, Installer._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST);
                        zone.insert_requests.push(Installer.build_binded_insert_request(site, sub_zone));
                        temp_zone = temp_zone.slice(Installer._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST);
                    }
                    Installer.execute_requests_for_zone(site, zone, function () {
                        Installer.checkpoint("saved_zones", site.zones.length, callback);
                    });
                })(i);
            }
        },

        execute_requests_for_zone: function (site, zone, callback) {

            if (zone.insert_requests.length === 0) {
                return Installer.checkpoint("rqst" + zone.table_name, zone.insert_requests.length, callback);
            }

            for (var i = 0; i < zone.insert_requests.length; i++) {
                (function (zone, request) {
                    SQLite.openDatabase({
                        name: zone.database_name
                    }).transaction(function (transaction) {
                        transaction.executeSql(request.request, request.args, function () {
                            Installer.checkpoint("rqst" + zone.table_name, zone.insert_requests.length, callback);
                            return;
                        }, function (tx, sqlerror) {
                            console.error(sqlerror.message);
                            Installer.checkpoint("rqst" + zone.table_name, zone.insert_requests.length, callback);
                        });
                    });
                })(zone, zone.insert_requests[i]);
            }
        },

        build_binded_insert_request: function (site, assets) {

            var request = '',
                asset, asset_, guid, check = /\'/g,
                metamodel = site.metamodel,
                symbology = site.symbology,
                bounds, geometry, symbolId, angle, label, args = [],
                fields_in_request = ['xmin', 'xmax', 'ymin', 'ymax', 'geometry', 'symbolId', 'angle', 'label', 'maplabel', 'minzoom', 'maxzoom', 'asset'],
                fields_to_delete = ['guids', 'bounds', 'geometry', 'classindex', 'angle'],
                assets_length = assets.length,
                values_in_request,
                i, j, k;

            for (i = 0; i < assets_length; i++) {
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
        },

        uninstallSite: function (site, callback) {
            for (var i = 0; site && i < site.zones.length; i++) {
                SQLite.openDatabase({
                    name: site.zones[i].database_name
                }).transaction(function (transaction) {
                    transaction.executeSql('DROP TABLE IF EXISTS ASSETS', [], function () {
                        Installer.checkpoint("destroy_zones_databases", site.zones.length, callback);
                    }, Smartgeo.log);
                });
            }
        }
    };

    return Installer;

});
