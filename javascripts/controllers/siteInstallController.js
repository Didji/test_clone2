function siteInstallController($scope, $routeParams, $http, Smartgeo, SQLite, $location) {
    $scope.siteId = $routeParams.site;

    $http.get(Smartgeo.get('url')+"gi.maintenance.mobility.site.json")
        .success(function(sites){
            $scope.sites = JSON.parse(localStorage.sites || '{}') ;
            angular.extend($scope.sites, sites);

            for (var i = 0; i < sites.length; i++) {
                if(sites[i].id === $scope.siteId){
                    $scope.site = sites[i];
                }
            }
            $scope.steps = [{
                color: 'hsl(0, 75%, 75%)',
                progress: 10,
                target: 100,
                name: 'Paramétrage'
            }];
            $scope.totalProgress = 10000000;
            $scope.Math = Math;

            $http.get(Smartgeo.get('url')+'gi.maintenance.mobility.installation.json&site='+$routeParams.site)
                .success(function(site) {

                    var metamodel = {}, lists = {}, symbology = {}, stats =[], i = 0, id;

                    for (i = 0; i < site.metamodel.length; i++) {
                        metamodel[site.metamodel[i].okey] = site.metamodel[i];
                    }
                    site.metamodel = metamodel ;
                    $scope.steps[0].progress = 30;

                    site.activities._byId = [];
                    for (i = 0; i < site.activities.length; i++) {
                        if(!metamodel[site.activities[i].okey]) {
                            continue;
                        }

                        site.activities._byId[site.activities[i].id] = site.activities[i];
                    }
                    $scope.steps[0].progress = 50;


                    for (var key in site.lists) {
                        if (site.lists.hasOwnProperty(key)) {
                            lists[key] = site.lists[key];
                        }
                    }
                    site.lists = lists ;
                    $scope.steps[0].progress = 80;

                    for (i = 0; i < site.symbology.length; i++) {
                        var symbolId = site.symbology[i].okey + '' + site.symbology[i].classindex + '' ;
                        symbology[symbolId] = site.symbology[i];
                    }
                    site.symbology = symbology ;
                    $scope.steps[0].progress = 100;

                    var total = 100, i = 0;
                    for(var okey in site.number){
                        if (site.number.hasOwnProperty(okey) && okey !== 'total') {
                            stats.push({
                                'okey'   : okey,
                                'amount' : site.number[okey],
                            });
                            total += 1*site.number[okey];
                        }
                    }
                    for(i = 0, lim = stats.length; i < lim; i++) {
                        var step = {
                            color: 'hsl('+(Math.round((i + 1) * 280 / lim))+', 75%, 75%)',
                            progress: 0,
                            target: site.number[stats[i].okey],
                            name: metamodel[stats[i].okey].label
                        };
                        stats[i].step = step;
                        $scope.steps.push(step);
                    }
                    $scope.totalProgress = total;
                    site.stats = stats;


                    angular.extend($scope.site, site);

                    $scope.createZones();
                    $scope.createZonesDatabases(function(){
                        $scope.installAssets(stats,$scope.endInstall);
                    });
                });
    });

    $scope.endInstall = function(){
        $scope.site.installed = true ;
        var toBeStoredSites =  JSON.parse(localStorage.sites || '{}') ;
            toBeStoredSites[$routeParams.site] = $scope.site;
        localStorage.sites = JSON.stringify(toBeStoredSites);
        $location.path('/map/'+$routeParams.site);
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    };

    $scope.installAssets = function(stats, callback){
        if(!stats.length){
            return callback() ;
        }

        $scope.installOkey(stats[0], function(){
            $scope.installAssets(stats.slice(1), callback);
        });
    };

    $scope.installOkey = function (objectType, callback){
        $scope.currentInstalledOkey = objectType.okey ;
        objectType.step.progress = 0;
        if(objectType.amount > Smartgeo._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST){
            $scope.installOkeyPerSlice(objectType, 0, callback);
        } else {
            $http
                .get(Smartgeo.get('url')+'gi.maintenance.mobility.installation.assets.json&okey='+objectType.okey)
                .success(function(data){
                    $scope.save(data.assets, function(){
                        callback();
                    });
                })
                .error(function(){
                    $scope.installOkey(objectType, callback);
                });
        }
    };

    $scope.installOkeyPerSlice = function(objectType, lastFetched, callback){
        if(lastFetched >= objectType.amount){
            objectType.step.progress = Math.min(objectType.amount, lastFetched);
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
                $scope.save(data.assets, function(){
                    objectType.step.progress = Math.min(lastFetched, objectType.amount);
                    $scope.installOkeyPerSlice(objectType, newlastFetched, callback);
                });
            }).error(function(){
                objectType.step.progress = Math.min(lastFetched, objectType.amount);
                $scope.installOkeyPerSlice(objectType, newlastFetched, callback);
            });
    };

    $scope.save = function(assets, callback) {
        $scope.distribute_assets_in_zones(assets);
        $scope.save_zones_to_database(function() {
            $scope.clean_zones();
            callback();
        });
    };

    $scope.clean_zones = function() {
        for (var i = 0; i < $scope.site.zones.length; i++){
            if ($scope.site.zones[i].assets) {
                $scope.site.zones[i].assets_count = ($scope.site.zones[i].assets_count || 0) + $scope.site.zones[i].assets.length;
                $scope.site.zones[i].assets = [];
                $scope.site.zones[i].insert_requests = [];
            }
        }
    };

    $scope.distribute_assets_in_zones = function(assets) {

        if (!assets){
            return false;
        }

        var asset, bounds, asset_extent, zones = $scope.site.zones;

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
                if ($scope.extents_match(zones[j].extent, asset_extent)){
                    zones[j].assets.push(asset);
                }
            }
        }
    };

    $scope.save_zones_to_database = function(callback) {

        for (var i = 0; i < $scope.site.zones.length; i++) {
            (function(i) {
                var temp_zone, sub_zone, zone = $scope.site.zones[i];
                if (zone.assets){
                    temp_zone = zone.assets;
                } else {
                    return $scope.i_just_save_myself("saved_zones",  $scope.site.zones.length, callback);
                }
                while (temp_zone.length) {
                    sub_zone = temp_zone.slice(0, Smartgeo._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST);
                    zone.insert_requests.push($scope.build_binded_insert_request(sub_zone));
                    temp_zone = temp_zone.slice(Smartgeo._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST);
                }
                $scope.execute_requests_for_zone(zone, function() {
                    $scope.i_just_save_myself("saved_zones", $scope.site.zones.length, callback);
                });
            })(i);
        }
    };

    $scope.execute_requests_for_zone = function(zone, callback) {

        if (zone.insert_requests.length === 0) {
            return $scope.i_just_save_myself("rqst" + zone.table_name, zone.insert_requests.length, callback);
        }

        for (var i = 0; i < zone.insert_requests.length; i++) {
            (function(zone, request) {
                SQLite.openDatabase({name: zone.database_name}).transaction(function(transaction){
                    transaction.executeSql(request.request, request.args, function() {
                        $scope.i_just_save_myself("rqst" + zone.table_name, zone.insert_requests.length, callback);
                        return ;
                    }, function() {
                        $scope.i_just_save_myself("rqst" + zone.table_name, zone.insert_requests.length, callback);
                        return ;
                    });
                });
            })(zone, zone.insert_requests[i]);
        }
    };


    $scope.i_just_save_myself  =  function(attribute, treeshold, callback) {
        $scope[attribute] = 1 * ($scope[attribute] || 0) + 1;
        if ($scope[attribute] >= treeshold) {
            $scope[attribute] = 0;
            return callback();
        } else {
            return false;
        }
    };

    $scope.build_binded_insert_request = function(assets) {
        var request = '',
            asset, asset_, guid, check = /\'/g,
            metamodel = $scope.site.metamodel,
            symbology = $scope.site.symbology,
            bounds, geometry, symbolId, angle, label, args = [],
            fields_in_request = ['xmin', 'xmax', 'ymin', 'ymax', 'geometry', 'symbolId', 'angle', 'label', 'minzoom', 'maxzoom', 'asset'],
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
    };

    $scope.extents_match = function(extent1, extent2) {
        return extent1.xmax > extent2.xmin &&
            extent2.xmax > extent1.xmin &&
            extent1.ymax > extent2.ymin &&
            extent2.ymax > extent1.ymin;
    };

    $scope.createZones = function(){
        var zones = [];

        var zones_matrix_length = Math.ceil(Math.sqrt(Math.pow(2, Math.ceil(Math.log($scope.site.number.total / Smartgeo._INSTALL_MAX_ASSETS_PER_ZONE) / Math.LN2))));
            zones_matrix_length = Math.min(zones_matrix_length, Smartgeo._INSTALL_MAX_ZONES_MATRIX_LENGTH);

        var zones_matrix_width  = ($scope.site.extent.xmax - $scope.site.extent.xmin) / zones_matrix_length,
            zones_matrix_height = ($scope.site.extent.ymax - $scope.site.extent.ymin) / zones_matrix_length;

        for (var i = 0; i < zones_matrix_length; i++) {
            for (var j = 0; j < zones_matrix_length; j++) {
                extent = {
                    xmin: $scope.site.extent.xmin +       i * zones_matrix_width,
                    xmax: $scope.site.extent.xmin + (i + 1) * zones_matrix_width,
                    ymin: $scope.site.extent.ymin +       j * zones_matrix_height,
                    ymax: $scope.site.extent.ymin + (j + 1) * zones_matrix_height
                };
                zones.push({
                    extent: extent,
                    assets: [],
                    insert_requests: [],
                    table_name: 'G' + JSON.stringify(extent).replace(/\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, ''),
                    database_name: 'G' + JSON.stringify(extent).replace(/\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, '')
                });
            }
        }
        $scope.site.zones = zones;
    };

    $scope.createZonesDatabases = function(callback){
        for (var i = 0; i < $scope.site.zones.length; i++) {
            SQLite.openDatabase({name: $scope.site.zones[i].database_name}).transaction(function(transaction){
                transaction.executeSql('DROP TABLE IF EXISTS ASSETS');
                transaction.executeSql('CREATE TABLE IF NOT EXISTS ASSETS (id, xmin real, xmax real, ymin real, ymax real, geometry, symbolId,  angle, label, minzoom integer, maxzoom integer, asset)');
                transaction.executeSql('CREATE INDEX IF NOT EXISTS IDX_ASSETS ON ASSETS (xmin , xmax , ymin , ymax, symbolId , minzoom , maxzoom)', [], function(){
                    $scope.i_just_save_myself("create_zones_databases_", $scope.site.zones.length, callback);
                });
            });
        }
    };
}

