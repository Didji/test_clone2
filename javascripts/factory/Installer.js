angular.module('smartgeomobile').factory('Installer', function(SQLite, Smartgeo, G3ME, $http){

    var Installer = {

        deleteAssets: function(site, assets, callback){
            if(assets.lenght > _INSTALL_MAX_ASSETS_PER_DELETE_REQUEST){
                // TODO :
            } else {
                var request = " DELETE FROM ASSETS WHERE id in ( '"+assets.join("','")+"' ) ";

                for (var i = 0; i < site.zones.length; i++) {
                    SQLite.openDatabase({name: site.zones[i].database_name}).transaction(function(transaction){
                        transaction.executeSql(request , [], function(){
                            Installer.checkpoint("_remove_assets_", site.zones.length, callback);
                        });
                    });
                }
            }
        },

        formatSiteMetadata: function(site){

            var metamodel   = {},
                lists       = {},
                symbology   = {},
                activities  = [],
                stats       = [],
                i = 0;

            for (i = 0; i < site.metamodel.length; i++) {
                if(site.number[site.metamodel[i].okey] != 0 ){
                    metamodel[site.metamodel[i].okey] = site.metamodel[i];
                }
            }
            site.metamodel = metamodel ;

            activities._byId = [];
            for (i = 0; i < site.activities.length; i++) {
                if(site.number[site.activities[i].okeys[0]] != 0 ){
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
            site.lists = lists ;

            for (i = 0; i < site.symbology.length; i++) {
                var symbolId = site.symbology[i].okey + '' + site.symbology[i].classindex + '' ;
                symbology[symbolId] = site.symbology[i];
            }
            site.symbology = symbology ;

            for(var okey in site.number){
              if (site.number.hasOwnProperty(okey) && okey !== 'total' && site.number[okey] != 0) {
                  stats.push({
                      'okey'   : okey,
                      'amount' : site.number[okey],
                  });
              }
            }
            site.stats = stats ;

            return site ;
        },

        getInstallJSON: function(siteId, callback){
            $http.get(Smartgeo.get('url')+'gi.maintenance.mobility.installation.json&site='+siteId)
                .success(callback);
        },

        saveSite: function(site){
            var sites = JSON.parse( Smartgeo.get('sites') || '{}' ) ;
            sites[site.id] = site ;
            Smartgeo.set('sites', JSON.stringify(sites));
        },

        createZones: function(site, callback){

            var zones_matrix_length = Math.ceil(Math.sqrt(Math.pow(2, Math.ceil(Math.log(site.number.total / Smartgeo._INSTALL_MAX_ASSETS_PER_ZONE) / Math.LN2))));
                zones_matrix_length = Math.min(zones_matrix_length, Smartgeo._INSTALL_MAX_ZONES_MATRIX_LENGTH),
                zones_matrix_width  = (site.extent.xmax - site.extent.xmin) / zones_matrix_length,
                zones_matrix_height = (site.extent.ymax - site.extent.ymin) / zones_matrix_length;

            site.zones = [];

            for (var i = 0; i < zones_matrix_length; i++) {
                for (var j = 0; j < zones_matrix_length; j++) {
                    extent = {
                        xmin: site.extent.xmin +       i * zones_matrix_width,
                        xmax: site.extent.xmin + (i + 1) * zones_matrix_width,
                        ymin: site.extent.ymin +       j * zones_matrix_height,
                        ymax: site.extent.ymin + (j + 1) * zones_matrix_height
                    };
                    site.zones.push({
                        extent:             extent,
                        assets:             [],
                        insert_requests:    [],
                        table_name:         JSON.stringify(extent).replace(/\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, ''),
                        database_name:      JSON.stringify(extent).replace(/\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, '')
                    });
                }
            }

            for (var i = 0; i < site.zones.length; i++) {
                SQLite.openDatabase({name: site.zones[i].database_name}).transaction(function(transaction){
                    transaction.executeSql('DROP TABLE IF EXISTS ASSETS');
                    transaction.executeSql('CREATE TABLE IF NOT EXISTS ASSETS (id, xmin real, xmax real, ymin real, ymax real, geometry, symbolId,  angle, label, maplabel, minzoom integer, maxzoom integer, asset)');
                    transaction.executeSql('CREATE INDEX IF NOT EXISTS IDX_ASSETS ON ASSETS (xmin , xmax , ymin , ymax, symbolId , minzoom , maxzoom)', [], function(){
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

        install: function(site, stats, callback){

            if(!stats.length){
                return callback() ;
            }

            Installer.installOkey(site, stats[0], function(){
                Installer.install(site, stats.slice(1), callback);
            });

        },

        installOkey : function (site, objectType, callback){

            if(objectType.amount > Smartgeo._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST){
                Installer.installOkeyPerSlice(site, objectType, 0, callback);
            } else {
                $http
                    .get(Smartgeo.get('url')+'gi.maintenance.mobility.installation.assets.json&okey='+objectType.okey)
                    .success(function(data){
                        Installer.save(site, data.assets, function(){
                            callback();
                        });
                    })
                    .error(function(){
                        Installer.installOkey(site, objectType, callback);
                    });
            }
        },


        installOkeyPerSlice: function (site, objectType, lastFetched, callback){
            if(lastFetched >= objectType.amount){
                return callback();
            }
            var newlastFetched   = lastFetched + Smartgeo._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST,
                url              =  Smartgeo.get('url') + 'gi.maintenance.mobility.installation.assets.json';

            url += '&okey=' + objectType.okey;
            url += '&min='  + (lastFetched+1);
            url += '&max='  + newlastFetched;

            $http
                .get(url)
                .success(function(data){
                    Installer.save(site, data.assets, function(){
                        Installer.installOkeyPerSlice(site, objectType, newlastFetched, callback);
                    });
                }).error(function(){
                    Installer.installOkeyPerSlice(site, objectType, newlastFetched, callback);
                });
        },


        save: function (site, assets, callback) {
            Installer.distribute_assets_in_zones(site, assets);
            Installer.save_zones_to_database(site, function() {
                Installer.clean_zones(site);
                callback();
            });
        },

        clean_zones: function (site) {
            for (var i = 0; i < site.zones.length; i++){
                if (site.zones[i].assets) {
                    site.zones[i].assets_count = (site.zones[i].assets_count || 0) + site.zones[i].assets.length;
                    site.zones[i].assets = [];
                    site.zones[i].insert_requests = [];
                }
            }
        },

        distribute_assets_in_zones: function(site, assets) {

            if (!assets){
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
                for (var j = 0, zones_length = zones.length; j < zones_length; j++){
                    if (G3ME.extents_match(zones[j].extent, asset_extent)){
                        zones[j].assets.push(asset);
                    }
                }
            }
        },


        save_zones_to_database: function (site, callback) {

            for (var i = 0; i < site.zones.length; i++) {
                (function(i) {
                    var temp_zone, sub_zone, zone = site.zones[i];
                    if (zone.assets){
                        temp_zone = zone.assets;
                    } else {
                        return Installer.checkpoint("saved_zones",  site.zones.length, callback);
                    }
                    while (temp_zone.length) {
                        sub_zone = temp_zone.slice(0, Smartgeo._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST);
                        zone.insert_requests.push(Installer.build_binded_insert_request(site, sub_zone));
                        temp_zone = temp_zone.slice(Smartgeo._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST);
                    }
                    Installer.execute_requests_for_zone(site, zone, function() {
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
                (function(zone, request) {
                    SQLite.openDatabase({name: zone.database_name}).transaction(function(transaction){
                        transaction.executeSql(request.request, request.args, function() {
                            Installer.checkpoint("rqst" + zone.table_name, zone.insert_requests.length, callback);
                            return ;
                        }, function() {
                            Installer.checkpoint("rqst" + zone.table_name, zone.insert_requests.length, callback);
                            return ;
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
                i ,j, k;

            for (i=0; i < assets_length; i++) {
                asset = assets[i];
                asset_ = asset ; // THIS MAY CAUSE MEMORY LEAKS --- > asset_ = angular.copy(asset);
                guid = asset.guid;
                bounds = asset.bounds;

                request += (request === '' ? "INSERT INTO ASSETS SELECT " : " UNION SELECT ") + " ? as id ";

                for (j = 0; j < fields_in_request.length; j++){
                    request += ' , ? as ' + fields_in_request[j];
                }
                // for (k = 0; k < fields_to_delete.length; k++){
                //     delete asset_[fields_to_delete[k]];
                // }
                args.push(guid,
                    bounds.sw.lng, bounds.ne.lng, bounds.sw.lat, bounds.ne.lat,
                    JSON.stringify(asset.geometry), ("" + asset.okey + asset.classindex), (asset.angle || ""), ('' + (asset.attributes[metamodel[asset.okey].ukey] || "")),
                    asset.maplabel || '',
                    1 * symbology[("" + asset.okey + asset.classindex)].minzoom,
                    1 * symbology[("" + asset.okey + asset.classindex)].maxzoom,
                    JSON.stringify(asset_)
                );

                if (assets[i]){
                    delete assets[i];
                }
            }
            return {
                request: ((request !== '') ? request : 'SELECT 1'),
                args: args
            };
        }


    };

    return Installer ;

});

//     function endInstall(){
//         site.installed = true ;
//         var toBeStoredSites =  JSON.parse(localStorage.sites || '{}') ;
//             toBeStoredSites[$routeParams.site] = site;
//         localStorage.sites = JSON.stringify(toBeStoredSites);
//         $location.path('/map/'+$routeParams.site);
//         if(!$scope.$$phase) {
//             $scope.$apply();
//         }
//     };


