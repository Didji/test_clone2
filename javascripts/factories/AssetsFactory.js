angular.module('smartgeomobile').factory('AssetsFactory', function(SQLite, Smartgeo, G3ME, $http, $rootScope, $browser, $timeout){

    var AssetsFactory = {

        save   : function(args){

            this.deferred = $q.defer();

            // this.deferred.resolve() on sucess

            if(typeof args !== 'array'){
                args = [args];
            } else if(typeof args !== 'array'){
                return this.deferred.reject('args must be an array or an object');
            }

            if(args.length >= 20){
                while(args.length > 0){
                    this.__batchSave(args.slice(-20));
                    args = args.slice(20);
                }
                return ;
            } else {
                for (var i = 0; i < args.length; i++) {
                    this.__save(args[i]);
                }
            }

            return this.deferred.promise;
        },

        __save  : function(asset){
            SQLite.insert(asset, function(){
                this.deferred.resolve(assets);
            }, function(error){
                this.deferred.reject(error);
            });
        },

        __batchSave  : function(assets){
            SQLite.batchInsert(assets, function(){
                this.deferred.resolve(assets);
            }, function(error){
                this.deferred.reject(error);
            });
            // Can this line be ok if batchInsert is a promise ?
            // this.deferred.resolve(SQLite.batchInsert(assets)) ;
        },

        retreive : function(){},

        update   : function(){},

        delete   : function(){},

        __buildBindedBatchRequest: function (site, assets) {

             var request = '',
                asset, asset_, guid, check = /\'/g,
                metamodel = site.metamodel,
                symbology = site.symbology,
                bounds, geometry, symbolId, angle, label, args = [],
                fields_in_request = ['xmin', 'xmax', 'ymin', 'ymax', 'geometry', 'symbolId', 'angle', 'label', 'maplabel', 'minzoom', 'maxzoom', 'asset'],
                fields_to_delete = ['guids', 'bounds', 'geometry', 'classindex', 'angle'],
                assets_length = assets.length, values_in_request,
                i ,j, k;

            for (i=0; i < assets_length; i++) {
                asset = assets[i];
                asset_ = JSON.parse(JSON.stringify(asset)) ;
                guid = asset.guid;
                bounds = asset.bounds;

                request += (request === '' ? "INSERT INTO ASSETS SELECT " : " UNION SELECT ") + " "+guid+" as id ";

                for (k = 0; k < fields_to_delete.length; k++){
                    delete asset_[fields_to_delete[k]];
                }

                values_in_request = [
                    bounds.sw.lng, bounds.ne.lng, bounds.sw.lat, bounds.ne.lat,
                    JSON.stringify(asset.geometry),
                    ("" + asset.okey + asset.classindex), (asset.angle || ""), ('' + (asset.attributes[metamodel[asset.okey].ukey] || "")),
                    asset.maplabel || '',
                    1 * symbology[("" + asset.okey + asset.classindex)].minzoom,
                    1 * symbology[("" + asset.okey + asset.classindex)].maxzoom,
                    JSON.stringify(asset_)
                ];

                for (j = 0; j < fields_in_request.length; j++){
                    request += ' , \'' + JSON.stringify(values_in_request[j]).replace(/^"(.+)"$/, '$1').replace(/\\"/g, '"').replace(/'/g, '&#039;' ) + '\' as ' + fields_in_request[j];
                }

                if (assets[i]){
                    delete assets[i];
                }
            }
            return {
                request: ((request !== '') ? request : 'SELECT 1'),
                args: []
            };
        },

        __buildBatchRequest: function (site, assets) {

            // var request = '',
            //     asset, asset_, guid, check = /\'/g,
            //     metamodel = site.metamodel,
            //     symbology = site.symbology,
            //     bounds, geometry, symbolId, angle, label, args = [],
            //     fields_in_request = ['xmin', 'xmax', 'ymin', 'ymax', 'geometry', 'symbolId', 'angle', 'label', 'maplabel', 'minzoom', 'maxzoom', 'asset'],
            //     fields_to_delete = ['guids', 'bounds', 'geometry', 'classindex', 'angle'],
            //     assets_length = assets.length,
            //     i ,j, k;

            // for (i=0; i < assets_length; i++) {
            //     asset = assets[i];
            //     asset_ = JSON.parse(JSON.stringify(asset)) ; // THIS MAY CAUSE MEMORY LEAKS (was asset_ = angular.copy(asset)) ;
            //     // asset_ = asset ; // THIS MAY CAUSE MEMORY LEAKS (was asset_ = angular.copy(asset)) ;
            //     guid = asset.guid;
            //     bounds = asset.bounds;

            //     request += (request === '' ? "INSERT INTO ASSETS SELECT " : " UNION SELECT ") + " ? as id ";

            //     for (j = 0; j < fields_in_request.length; j++){
            //         request += ' , ? as ' + fields_in_request[j];
            //     }
            //     for (k = 0; k < fields_to_delete.length; k++){
            //         delete asset_[fields_to_delete[k]];
            //     }
            //     args.push(guid,
            //         bounds.sw.lng, bounds.ne.lng, bounds.sw.lat, bounds.ne.lat,
            //         JSON.stringify(asset.geometry), ("" + asset.okey + asset.classindex), (asset.angle || ""), ('' + (asset.attributes[metamodel[asset.okey].ukey] || "")),
            //         asset.maplabel || '',
            //         1 * symbology[("" + asset.okey + asset.classindex)].minzoom,
            //         1 * symbology[("" + asset.okey + asset.classindex)].maxzoom,
            //         JSON.stringify(asset_)
            //     );

            //     if (assets[i]){
            //         delete assets[i];
            //     }
            // }
            // return {
            //     request: ((request !== '') ? request : 'SELECT 1'),
            //     args: args
            // };
        }


    };

    return AssetsFactory;

});
