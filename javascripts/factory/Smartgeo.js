angular.module('smartgeomobile').factory('Smartgeo', function(SQLite){

    var Smartgeo = {

        // MAP CONSTANTS
        _MAP_MAX_ZOOM : 20,
        _MAP_MIN_ZOOM : 13,

        // INSTALLATION CONSTANTS
        // TODO: make Installation or AssetsPersistence factory
        _INSTALL_MAX_ASSETS_PER_HTTP_REQUEST     : 1000,
        _INSTALL_MAX_ASSETS_PER_ZONE             : 2048,
        _INSTALL_MAX_ASSETS_PER_INSERT_REQUEST   : 60,
        _INSTALL_MAX_ZONES_MATRIX_LENGTH         : 4,

        // GLOBAL CONSTANTS
        _SMARTGEO_MOBILE_VERSION    : "0.9.0",
        _G3ME_VERSION               : "0.1.0",

        // METHODS
        setGimapUrl : function(){
            var url = prompt('URL GiMAP', localStorage.url||'');
            if(!url && url !== null) {
                return this.setGimapUrl();
            } else if (url === null){
                return null;
            }
            if( url.indexOf('http') === -1 ) {
                url = 'http://'+url;
            }
            if( url.indexOf('index.php?service=') === -1 ) {
                url = url + '/index.php?service=';
            }
            Smartgeo.reset();
            return this.set('url', url);
        },

        reset: function(){
            localStorage.clear();
        },

        log: function(){
            console.log(arguments);
        },

        findAssetsByGuids: function(site, guids, callback, zones, partial_response){
             if (!zones) {
                zones = site.zones ;
                partial_response = [];
            }

            if (!zones.length) {
                return callback(partial_response);
            }
            if (typeof guids !== 'object') {
                guids = [guids];
            }
            if (guids.length === 0) {
                return callback([]);
            }

            var arguments_ = [],
                _this = this,
                request = 'SELECT * FROM ASSETS ',
                j;

            for (j = 0; j < guids.length; j++) {
                request += j === 0 ? ' WHERE ' : ' or ';
                request += ' (id like ? or id = ? ) ';
                arguments_.push(1 * guids[j], 1 * guids[j]);
            }

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, arguments_,
                    function(tx, rslt) {
                        for (var i = 0; i < rslt.rows.length; i++) {
                            var ast = rslt.rows.item(i);
                            ast.okey = JSON.parse(ast.asset.replace(new RegExp('\n', 'g'), ' ')).okey;
                            partial_response.push(ast);
                        }
                        _this.findAssetsByGuids(site,guids, callback, zones.slice(1), partial_response);
                    },
                    function(SqlError) {
                        console.log(JSON.stringify(SqlError));
                    });
            }, function(SqlError) {
                console.log(JSON.stringify(SqlError));
            });

        },

        findAssetsByOkey: function(site, okey, callback, zones, partial_response){
            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (!zones.length) {
                return callback(partial_response);
            }

            var request = 'SELECT * FROM ASSETS WHERE symbolId like ? or symbolId = ?',  _this = this;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, [okey + "%", okey + "%"],
                    function(t, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            var asset = results.rows.item(i);
                            asset.okey = JSON.parse(asset.asset.replace(new RegExp('\n', 'g'), ' ')).okey;
                            partial_response.push(asset);
                        }
                        _this.findAssetsByOkey(site,okey, callback, zones.slice(1), partial_response);
                    }, Smartgeo.log, Smartgeo.log);
            }, Smartgeo.log);
        },

        findAssetsByLabel: function(site, label, callback, zones, partial_response){
            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (!zones.length) {
                return callback(partial_response);
            }

            var request = 'SELECT * FROM ASSETS WHERE label like ? or label = ?',  _this = this;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, [label + "%", label + "%"],
                    function(t, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            var asset = results.rows.item(i);
                            asset.okey = JSON.parse(asset.asset.replace(new RegExp('\n', 'g'), ' ')).okey;
                            partial_response.push(asset);
                        }
                        _this.findAssetsByLabel(site,label, callback, zones.slice(1), partial_response);
                    }, Smartgeo.log, Smartgeo.log);
            }, Smartgeo.log);
        },

        findAssetsByCriteria: function(site, search, callback, zones, partial_response, request){
            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (!zones.length) {
                return callback(partial_response);
            }
            if(!request){
                request = 'SELECT * FROM ASSETS WHERE ';
                var g = '';
                for(var criter in search.criteria){
                    if(search.criteria.hasOwnProperty(criter) && search.criteria[criter]){
                        if(isNaN(1*search.criteria[criter])){
                            g = '"';
                        } else {
                            g = '' ;
                        }
                        request += " (     asset like '%\"" + criter + "\":" + g + search.criteria[criter] + g + ",%'       ";
                        request += "   OR  asset like '%\"" + criter + "\":" + g + search.criteria[criter] + g + "}%' ) AND ";
                    }
                }
                request += ' 1 LIMIT 0, 10';
            }

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, [],
                    function(t, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            var asset = results.rows.item(i);
                            asset.okey = JSON.parse(asset.asset.replace(new RegExp('\n', 'g'), ' ')).okey;
                            partial_response.push(asset);
                        }
                        Smartgeo.findAssetsByCriteria(site,search, callback, zones.slice(1), partial_response, request);
                    }, Smartgeo.log, Smartgeo.log);
            }, Smartgeo.log);
        },

        // GETTER AND SETTER
        get: function(parameter){
            return this[parameter] || localStorage.getItem(parameter);
        },
        set: function(parameter, value){
            localStorage[parameter] = value ;
            return localStorage.setItem(parameter, value);
        }
    };

    // Initialization
    if(!Smartgeo.get('url')){
        Smartgeo.setGimapUrl();
    }
    return Smartgeo ;

});
