/**
 * @ngdoc service
 * @name smartgeomobile.Smartgeo
 * @description
 * Provides global methods
 */

angular.module('smartgeomobile').factory('Smartgeo', function($http, $window, $rootScope,$location, SQLite, IndexedDB){

    'use strict' ;

    var Smartgeo = {

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_SMARTGEO_MOBILE_VERSION
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description Smartgeo mobile version, displayed on home page
         */
        _SMARTGEO_MOBILE_VERSION : "0.12.0",

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_BIG_SCREEN_THRESHOLD
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description Width threshold which describes big screen
         */
        _BIG_SCREEN_THRESHOLD : 361,

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_SIDE_MENU_WIDTH
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description Width threshold which describes big screen
         */
        _SIDE_MENU_WIDTH : $window.screen.width > 361 ? 300 : $window.screen.width * 0.8 ,

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_MAX_RESULTS_PER_SEARCH
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description Define max results per search (and advanced search)
         */
        _MAX_RESULTS_PER_SEARCH : 10,

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#localStorageCache
         * @propertyOf smartgeomobile.Smartgeo
         * @description Used for setter and getter best perf
         */
         localStorageCache : {},

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_SERVER_UNREACHABLE_THRESHOLD
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description Timeout, in milliseconds, for ping and login method
         */
        _SERVER_UNREACHABLE_THRESHOLD : 15000,

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_MAX_MEDIA_PER_REPORT
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description Max media per report
         */

        _MAX_MEDIA_PER_REPORT : 3,

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#_MAX_ID_FOR_SELECT_REQUEST
         * @propertyOf smartgeomobile.Smartgeo
         * @const
         * @description
         */

        _MAX_ID_FOR_SELECT_REQUEST : 4000,

        _DONT_REALLY_RESET : false ,

        _intervals : {},

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#registerInterval
         * @methodOf smartgeomobile.Smartgeo
         * @param {String}   name
         * @param {function} f
         * @param {Integer}  interval
         * @description
         */
        registerInterval : function(name, f, interval){
            if(Smartgeo._intervals[name]){
                clearInterval(Smartgeo._intervals[name]);
            }
            Smartgeo._intervals[name] = setInterval(f, interval);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#clearIntervals
         * @methodOf smartgeomobile.Smartgeo
         * @description
         */
        clearIntervals : function(){
            for(var interval in Smartgeo._intervals){
                clearInterval(Smartgeo._intervals[interval]);
                delete Smartgeo._intervals[interval];
            }
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#clearInterval
         * @methodOf smartgeomobile.Smartgeo
         * @param {String}   name
         * @description
         */
        clearInterval : function(name){
            clearInterval(Smartgeo._intervals[name]);
            delete Smartgeo._intervals[name];
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#isRunningOnBigScreen
         * @methodOf smartgeomobile.Smartgeo
         * @returns {boolean} is smartgeo running on big screen
         * @description
         * Return true if device width is >= to {@link smartgeomobile.Smartgeo#_BIG_SCREEN_THRESHOLD Smartgeo.\_BIG\_SCREEN\_THRESHOLD}
         */
        isRunningOnBigScreen : function(){
            return ($window.screen.width >= Smartgeo._BIG_SCREEN_THRESHOLD);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#isRunningOnLittleScreen
         * @methodOf smartgeomobile.Smartgeo
         * @returns {boolean} is smartgeo running on little screen
         * @description
         * Return true if device width is < to {@link smartgeomobile.Smartgeo#_BIG_SCREEN_THRESHOLD Smartgeo.\_BIG\_SCREEN\_THRESHOLD}
         */
        isRunningOnLittleScreen : function(){
            return ($window.screen.width < Smartgeo._BIG_SCREEN_THRESHOLD);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#setGimapUrl
         * @methodOf smartgeomobile.Smartgeo
         * @param {string} url gimap server url
         * @returns {string} url setted server url
         * @description
         * Set Gimap serveur URL on localstorage, add **`http://`** and **`/index.php?service=`** if needed and clear localStorage
         */
        setGimapUrl : function(url){
            if (url === null){
                return null;
            }
            if( url.indexOf('http') === -1 ) {
                url = 'http://'+url;
            }
            if( url.indexOf('index.php?service=') === -1 ) {
                url = url + '/index.php?service=';
            }
            Smartgeo.reset();
            this.set('url', url);
            return url ;
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#reset
         * @methodOf smartgeomobile.Smartgeo
         * @description
         * Clear localStorage
         */
        reset: function(){
            if(Smartgeo._DONT_REALLY_RESET){
                return ;
            }
            localStorage.clear();
            var sites = Smartgeo.get_('sites') ;
            Smartgeo.unset_('sites');
            for(var k in sites){
                var site = sites[k] ;
                for (var i = 0; site.zones && i < site.zones.length; i++) {
                    SQLite.openDatabase({name: site.zones[i].database_name}).transaction(function(transaction){
                        transaction.executeSql('DROP TABLE IF EXISTS ASSETS');
                    });
                }
            }
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#getServiceUrl
         * @methodOf smartgeomobile.Smartgeo
         * @param {string} serviceName Name of called Service
         * @param {Object} GETParameters Associative array of get parameters name=>value
         * @returns {string} url Well formatted URL
         * @description
         * Get ready to call URL with a service's name and list of parameters
         * @example
         * <pre>
         * Smartgeo.getServiceUrl('gi.maintenance.mobility.installation.json', {
         *     'site'      : site.id,
         *     'timestamp' : site.timestamp
         * });
         * </pre>
         */
        getServiceUrl: function(serviceName, GETParameters){
            var url  = Smartgeo.get('url');
                url += serviceName ;

            for (var parameter in GETParameters){
                if(GETParameters.hasOwnProperty(parameter)){
                    url += '&'+parameter+'='+GETParameters[parameter];
                }
            }

            return url ;
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#ping
         * @methodOf smartgeomobile.Smartgeo
         * @param {function} callback Called with boolean which depends on gimap reachability
         * @description
         * Call global.dcnx.json gimap service to know if it is reachable. So this method logout current user.
         * It may be refactored when a real ping service will be available on gimap
         * @example
         * <pre>
         * Smartgeo.ping(function(gimapIsReachable){
         *     if(gimapIsReachable){
         *         // do things
         *     }
         * });
         * </pre>
         */
        ping : function(callback) {
            callback = callback || function(){};
            $http.post(Smartgeo.getServiceUrl('global.dcnx.json'), {}, {timeout: Smartgeo._SERVER_UNREACHABLE_THRESHOLD})
                .success(function(data){
                    Smartgeo.set('online', true);
                    callback(true);
                }).error(function(){
                    Smartgeo.set('online', false);
                    callback(false);
                });
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#sanitizeAsset
         * @methodOf smartgeomobile.Smartgeo
         * @param {string} asset serialized asset
         * @returns {Object} Satitized parsed asset
         * @description
         * Sanitize asset eg. replace horrible characters
         */
        sanitizeAsset: function(asset){
            return JSON.parse(asset.replace(/&#039/g, "'").replace(/\\\\/g, "\\"));
        },

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#parametersCache
         * @propertyOf smartgeomobile.Smartgeo
         * @description Setter and getter cache
         */
        parametersCache : window.smartgeoPersistenceCache || {},

        /**
         * @ngdoc property
         * @name smartgeomobile.Smartgeo#parametersCache_
         * @propertyOf smartgeomobile.Smartgeo
         * @description Setter and getter cache for async functions
         */
        parametersCache_ : window.smartgeoPersistenceCache_ || {},

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#get
         * @methodOf smartgeomobile.Smartgeo
         * @param {String} parameter Parameter's name
         * @returns {*} Parameter's value
         * @description
         * Local storage getter
         */
        get: function(parameter){
            if(Smartgeo.parametersCache[parameter]){
                return Smartgeo.parametersCache[parameter];
            } else {
                return JSON.parse(localStorage.getItem(parameter));
            }
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#set
         * @methodOf smartgeomobile.Smartgeo
         * @param {String} parameter Parameter's name
         * @param {*} value Parameter's value
         * @description
         * Local storage setter
         */
        set: function(parameter, value){
            Smartgeo.parametersCache[parameter] = value ;
            return localStorage.setItem(parameter, JSON.stringify(value));
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#unset
         * @methodOf smartgeomobile.Smartgeo
         * @param {String} parameter Parameter's name
         * @description
         * Clear localStorage's value
         */
        unset: function(parameter){
            delete Smartgeo.parametersCache[parameter]  ;
            return localStorage.removeItem(parameter);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#get_
         * @methodOf smartgeomobile.Smartgeo
         * @param {String} parameter Parameter's name
         * @param {function} callback Called with parameter's value
         * @returns {*} Parameter's value
         * @description
         * IndexedDB getter
         */
        get_: function(parameter, callback){
            if(Smartgeo.parametersCache_[parameter]){
                (callback || function(){})(Smartgeo.parametersCache_[parameter]) ;
                return Smartgeo.parametersCache_[parameter] ;
            } else {
                (window.indexedDB ? IndexedDB : SQLite).get(parameter, callback);
            }
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#set_
         * @methodOf smartgeomobile.Smartgeo
         * @param {String} parameter Parameter's name
         * @param {function} callback Called when value is setted
         * @returns {*} Parameter's value
         * @description
         * IndexedDB setter
         */
        set_: function(parameter, value, callback){
            Smartgeo.parametersCache_[parameter] = value ;
            (window.indexedDB ? IndexedDB : SQLite).set(parameter, value, callback);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#unset_
         * @methodOf smartgeomobile.Smartgeo
         * @param {String} parameter Parameter's name
         * @param {function} callback Called when value is unsetted
         * @description
         * Clear IndexedDB's value
         */
        unset_: function(parameter, callback){
            delete Smartgeo.parametersCache_[parameter] ;
            (window.indexedDB ? IndexedDB : SQLite).unset(parameter, callback);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#log
         * @methodOf smartgeomobile.Smartgeo
         * @description
         * Useless log wrapper
         */
        log: function(){
            console.log(arguments);
        },

        /**
         * @ngdoc method
         * @name smartgeomobile.Smartgeo#getUsersLocation
         * @methodOf smartgeomobile.Smartgeo
         * @description
         * Polyfill for geolocation api
         */
        getUsersLocation: function(success, error){
            if(SmartgeoChromium.locate){

                var LOCATED_TIMEOUT_FLAG;

                ChromiumCallbacks[0] = function(lng, lat, alt){
                    LOCATED_TIMEOUT_FLAG = true ;
                    success(lat, lng, alt);
                };

                SmartgeoChromium.locate();

                $timeout(function(){
                    if(!LOCATED_TIMEOUT_FLAG){
                        return ;
                    }
                    ChromiumCallbacks[0] = angular.noop ;
                    error();
                },10000);

            } else {
                navigator.geolocation.getCurrentPosition(function(position){
                    success(position.coords.latitude, position.coords.longitude, position.coords.altitude);
                }, function(){
                    error();
                });
            }
        },

        _isRunningOnMobile: function() {
            var check = false;
            (function(a){if(/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true;})(navigator.userAgent||navigator.vendor||window.opera);
            return check;
        },

        getRight: function(module){
            return window.smartgeoRightsManager[module];
        },

        findGeometryByGuids_big : function(site, guids, callback, partial_response){
            partial_response = partial_response || [];
            if(guids.length === 0){
                return callback(partial_response);
            } else {
                Smartgeo.findGeometryByGuids(site, guids.slice(0, Smartgeo._MAX_ID_FOR_SELECT_REQUEST), function(assets){
                    Smartgeo.findGeometryByGuids_big(site, guids.slice(Smartgeo._MAX_ID_FOR_SELECT_REQUEST), callback, partial_response.concat(assets));
                });
            }
        },

        findGeometryByGuids: function(site, guids, callback, zones, partial_response){

            if(guids.length > Smartgeo._MAX_ID_FOR_SELECT_REQUEST){
                return Smartgeo.findGeometryByGuids_big(site, guids, callback);
            }

            if (!zones) {
                zones = site.zones ;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                 window._SMARTGEO_STOP_SEARCH = false ;
                return callback([]);
            }

            if (!zones || !zones.length) {
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
                request = 'SELECT id, label, geometry, xmin, xmax, ymin, ymax FROM ASSETS WHERE id in ( ' + guids.join(',') + ')',
                j;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql('CREATE INDEX IF NOT EXISTS IDX_RUSTINE ON ASSETS (id)');
                t.executeSql(request, [],
                    function(tx, rslt) {
                        var asset ;
                        for (var i = 0; i < rslt.rows.length; i++) {
                            asset = rslt.rows.item(i);
                            partial_response.push({
                                guid        : asset.id,
                                label       : asset.label,
                                geometry    : JSON.parse(asset.geometry),
                                xmin        : asset.xmin,
                                xmax        : asset.xmax,
                                ymin        : asset.ymin,
                                ymax        : asset.ymax
                            });
                        }
                        _this.findGeometryByGuids(site,guids, callback, zones.slice(1), partial_response);
                    },
                    function(tx, SqlError) {
                        console.log(SqlError.message);
                        alertify.log(SqlError.message);
                        (error || function(){})();
                    });
            }, function(SqlError) {
                console.log(SqlError.message);
                alertify.log(SqlError.message);
                (error || function(){})();
            });
        },

        findAssetsByGuids: function(site, guids, callback, zones, partial_response){

            if(guids.length > Smartgeo._MAX_ID_FOR_SELECT_REQUEST){
                return Smartgeo.findAssetsByGuids_big(site, guids, callback);
            }

            if (!zones) {
                zones = site.zones ;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                 window._SMARTGEO_STOP_SEARCH = false ;
                return callback([]);
            }

            if (!zones || !zones.length) {
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
                request = 'SELECT * FROM ASSETS WHERE id in ( ' + guids.join(',') + ')',
                j;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql('CREATE INDEX IF NOT EXISTS IDX_RUSTINE ON ASSETS (id)');
                t.executeSql(request, [],
                    function(tx, rslt) {
                        for (var i = 0; i < rslt.rows.length; i++) {
                            var ast = angular.copy(rslt.rows.item(i));
                            ast.okey = JSON.parse(ast.asset.replace(new RegExp('\n', 'g'), ' ')).okey;
                            ast.guid = ast.id;
                            ast.geometry = JSON.parse(ast.geometry);
                            partial_response.push(ast);
                        }
                        _this.findAssetsByGuids(site,guids, callback, zones.slice(1), partial_response);
                    },
                    function(tx, SqlError) {
                        console.log(SqlError.message);
                        console.log(request);
                        alertify.log(SqlError.message);
                        (error || function(){})();
                    });
            }, function(SqlError) {
                console.log(SqlError);
                console.log(request);
            });
        },

        findAssetsByOkey: function(site, okey, callback, zones, partial_response){
            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (!zones.length || window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
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
                            asset.okey = Smartgeo.sanitizeAsset(asset.asset).okey ;
                            partial_response.push(asset);
                        }
                        _this.findAssetsByOkey(site,okey, callback, zones.slice(1), partial_response);
                    }, function(tx, SqlError){console.log(SqlError);}, function(tx, SqlError){console.log(SqlError);});
            }, function(tx, SqlError){console.log(SqlError);});
        },

        findAssetsByLabel: function(site, label, callback, zones, partial_response){

            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                 window._SMARTGEO_STOP_SEARCH = false ;
                return callback([]);
            }

            if (!zones.length) {
                return callback(partial_response);
            }

            var request = 'SELECT * FROM ASSETS WHERE label like ? limit 0, 10',  _this = this;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, ["%" + label + "%"],
                    function(t, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            var asset = results.rows.item(i);
                            asset.okey =  Smartgeo.sanitizeAsset(asset.asset).okey;
                            partial_response.push(asset);
                        }
                        _this.findAssetsByLabel(site,label, callback, zones.slice(1), partial_response);
                    }, function(tx, SqlError){
                        console.log(SqlError, request);
                    }, function(tx, SqlError){
                        console.log(SqlError, request);
                    });
            }, function(tx, SqlError){
                console.log(SqlError, request);
            });
        },

        findAssetsByCriteria: function(site, search, callback, zones, partial_response, request){


            if (!zones) {
                zones = site.zones;
                partial_response = [];
                console.time('Recherche');
            }


            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false ;
                return callback([]);
            }
            if (!zones.length || partial_response.length >= Smartgeo._MAX_RESULTS_PER_SEARCH) {
                console.timeEnd('Recherche');
                return callback(partial_response);
            }

            if (!request) {

                request = 'SELECT * FROM assets WHERE symbolid REGEXP(\'' + search.okey + '.*\') ';

                var criteria_length = Object.keys(search.criteria).length, i = 0 , regex ;

                for (var criter in search.criteria) {
                    if (search.criteria.hasOwnProperty(criter) && search.criteria[criter]) {
                        if (search.criteria[criter] == 1 * search.criteria[criter]) {
                            regex = "'.*\"" + criter.toLowerCase() + "\":" + search.criteria[criter] + "?[,\}].*'";
                        } else {
                            regex = "'.*\"" + criter.toLowerCase() + "\":\"[^\"]*" + search.criteria[criter].toLowerCase() + ".*'";
                        }
                        request += " AND LOWER(asset) REGEXP("+regex+") " ;
                    }
                }
                request += ' LIMIT ' + (Smartgeo._MAX_RESULTS_PER_SEARCH - partial_response.length) ;
            }

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, [],
                    function(t, results) {
                        console.timeEnd(request);

                        for (var i = 0; i < results.rows.length; i++) {
                            var asset = results.rows.item(i);
                            try{
                                asset.okey = Smartgeo.sanitizeAsset(asset.asset).okey ;
                            } catch(e){
                                console.log(e);
                                console.log(asset.asset);
                            }
                            partial_response.push(asset);
                        }
                        Smartgeo.findAssetsByCriteria(site,search, callback, zones.slice(1), partial_response, request);
                    },
                    function(tx, SqlError){console.log(SqlError);},
                function(tx, SqlError){console.log(SqlError);});
            },
            function(tx, SqlError){console.log(SqlError);});
        },


        uuid: function(){
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                            return v.toString(16);
                        });
        },

        _initializeGlobalEvents: function(){
            window.addEventListener( 'online', Smartgeo._onlineTask, false);
            window.addEventListener('offline', Smartgeo._offlineTask , false);

            if(!window.ChromiumCallbacks){
                window.ChromiumCallbacks = [] ;
            }

            window.ChromiumCallbacks[20] = Smartgeo._onlineTask ;
            window.ChromiumCallbacks[21] = Smartgeo._offlineTask;
        },

        _onlineTask : function() {
            setTimeout(function() {
                Smartgeo.set('online', true);
                $rootScope.$broadcast("DEVICE_IS_ONLINE");
                Smartgeo.log(("_SMARTGEO_ONLINE"));
                Smartgeo.silentLogin();
            }, 1000);
        },

        _offlineTask : function() {
            Smartgeo.set('online', false);
            $rootScope.$broadcast("DEVICE_IS_OFFLINE");
            Smartgeo.log(("_SMARTGEO_OFFLINE"));
        },

        silentLogin: function(callback){
            var user = Smartgeo.get('user') || {};
            if(user.token){
                Smartgeo.login(user.token, callback);
            } else if(user.username && user.password){
                Smartgeo.login(user.username, user.password, callback);
            }
        },

        rustineVeolia: function(sites, success, error){
            for(var i in sites){
                var site = sites[i];
                if(site && (site.id === $rootScope.site.id) && site.url && site.url.indexOf('veoliagroup') !== -1){
                    var url =  (Smartgeo.get('url') || '').replace(/^(https?:\/\/.+)index\.php.*$/, '$1') + site.url ;
                    $http.get(url).then(success, error) ;
                }
            }
        },

        selectSiteRemotely: function(site, success, error){
            if(!site){
                Smartgeo.log(("_SMARTGEO_ZERO_SITE_SELECTED"));
                return ;
            }
            var url = Smartgeo.getServiceUrl('global.auth.json', {
                    'app'   : 'mapcite',
                    'site'  : site,
                    'auto_load_map' : true
                });
            $http.post(url).then(function(response){
                if(response.data && response.data.sites && response.data.sites.length > 1){
                    Smartgeo.rustineVeolia(response.data.sites, success, error);
                } else {
                    (success || function(){})();
                }
            }, error || function(){});
        },
        login_o : function(user, success, error){
            // TODO : MERGE WITH LOGIN METHOD
            if(user.token){
                Smartgeo.login(user.token, success, error);
            } else {
                Smartgeo.login(user.username, user.password, success, error);
            }
        },
        login: function(login, password, success, error){
            if(Smartgeo._LOGIN_MUTEX){
                return (error || function(){})();
            }
            Smartgeo._LOGIN_MUTEX = true ;
            var token , url ;
            if(typeof password ===  'function' || !password){
                token   = login;
                error   = success ;
                success = password;
            }
            if(token){
                url  = Smartgeo.getServiceUrl('global.auth.json', {
                    'token'   : encodeURIComponent(token),
                    'mobility' : true
                });
            } else {
                url  = Smartgeo.getServiceUrl('global.auth.json', {
                    'login' : encodeURIComponent(login),
                    'pwd'   : encodeURIComponent(password),
                    'forcegimaplogin' : true
                });
            }
            $http.post(url,{},{timeout: Smartgeo._SERVER_UNREACHABLE_THRESHOLD}).success(function(){
                Smartgeo._LOGIN_MUTEX = false ;
                if($rootScope.site){
                    Smartgeo.selectSiteRemotely($rootScope.site.id, success, error);
                } else {
                    (success || function(){})();
                }
            }).error(function(response, status){
                Smartgeo._LOGIN_MUTEX = false ;
                (error || function(){})(response, status);
            });
        },
        clearPersistence : function(){
            Smartgeo.unset('lastLeafletMapExtent');
            Smartgeo.unset('persitence.menu.open');
            Smartgeo.unset('persitence.menu.open.level');
            var missions = Smartgeo.get('missions');
            for(var i in missions){
                missions[i].openned = false ;
            }
            if(missions){
                Smartgeo.set('missions', missions);
            }
        }
    };

    Smartgeo._initializeGlobalEvents();
    window.Smartgeo = Smartgeo;
    $rootScope.rights = window.smartgeoRightsManager ;
    return Smartgeo ;

});
