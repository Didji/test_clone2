angular.module('smartgeomobile').factory('Smartgeo', function(SQLite, $http, $window, $rootScope,$location, IndexedDB){

    var Smartgeo = {

        // MAP CONSTANTS
        _MAP_MAX_ZOOM : 20,
        _MAP_MIN_ZOOM : 13,

        // GLOBAL CONSTANTS
        _SMARTGEO_MOBILE_VERSION    : "0.9.3.1",
        _G3ME_VERSION               :   "0.1.0",
        _BIG_SCREEN_THRESHOLD       :       361,


        // TODO : put this in a RightsManager
        getRight: function(module){
            return this.smgeo_right[module];
        },

        smgeo_right : {
            'report' : false,
            'goto'   : false
        },

        isRunningOnBigScreen : function(){
            return ($window.screen.width >= Smartgeo._BIG_SCREEN_THRESHOLD);
        },

        isRunningOnLittleScreen : function(){
            return ($window.screen.width < Smartgeo._BIG_SCREEN_THRESHOLD);
        },

        // METHODS
        setGimapUrl : function(url){
            // // var url = Smartgeo._OVERRIDE_GIMAP_URL || prompt('URL GiMAP', Smartgeo.get('url') || '');
            // if(!url && url !== null) {
            //     return this.setGimapUrl();
            // } else
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

        reset: function(){
            localStorage.clear();
        },

        log: function(){
            console.log(arguments);
        },

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

        ping : function(callback) {
            callback = callback || function(){};
            $http.post(Smartgeo.getServiceUrl('global.dcnx.json'))
                .success(function(data){
                    Smartgeo.set('online', true);
                    callback(true);
                }).error(function(){
                    Smartgeo.set('online', false);
                    callback(false);
                });
        },

        sanitizeAsset: function(asset){
            return JSON.parse(asset.replace(/&#039/g, "'").replace(/\\\\/g, "\\"));
        },

        _isRunningOnMobile: function() {
            var check = false;
            (function(a){if(/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
            return check;
        },

        findAssetsByGuids: function(site, guids, callback, zones, partial_response){
             if (!zones) {
                zones = site.zones ;
                partial_response = [];
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

            if (!zones.length) {
                return callback(partial_response);
            }

            var request = 'SELECT * FROM ASSETS WHERE label like ? or label = ? limit 0, 10',  _this = this;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function(t) {
                t.executeSql(request, [label + "%", label + "%"],
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
                            g = '"%';
                        } else {
                            g = '' ;
                        }
                        request += " (     asset like '%\"" + criter + "\":" + g + search.criteria[criter] + g.split('').reverse().join('') + ",%'       ";
                        request += "   OR  asset like '%\"" + criter + "\":" + g + search.criteria[criter] + g.split('').reverse().join('') + "}%' ) AND ";
                    }
                }
                if(search.okey){
                    request += ' symbolId like "' + search.okey + '%" AND ' ;
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
                            try{
                                asset.okey = Smartgeo.sanitizeAsset(asset.asset).okey ; // .replace(/[\n\r]/g, ' ').replace(/&#039/g, "'").replace(/\\\\/g, "\\")).okey;
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
            }, function(tx, SqlError){console.log(SqlError);});
        },

        _initializeGlobalEvents: function(){

            window.addEventListener('online', function(e) {
                setTimeout(function() {
                    Smartgeo.set('online', true);
                    $rootScope.$broadcast("DEVICE_IS_ONLINE");
                    console.log("broadcasting DEVICE_IS_ONLINE");
                    Smartgeo.silentLogin();
                }, 1000);
            }, false);

            window.addEventListener('offline', function(e) {
                Smartgeo.set('online', false);
                $rootScope.$broadcast("DEVICE_IS_OFFLINE");
                console.log("broadcasting DEVICE_IS_OFFLINE");
            }, false);

        },

        silentLogin: function(){
            var user = Smartgeo.get('user') || {};
            if(user.token){
                Smartgeo.login(user.token);
            } else if(user.username && user.password){
                Smartgeo.login(user.username, user.password);
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
                console.log("Aucun site n'a été spécifié.");
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
                    'token'   : encodeURIComponent(token)
                });
            } else {
                url  = Smartgeo.getServiceUrl('global.auth.json', {
                    'login' : encodeURIComponent(login),
                    'pwd'   : encodeURIComponent(password),
                    'forcegimaplogin' : true
                });
            }
            $http.post(url).success(function(){
                Smartgeo._LOGIN_MUTEX = false ;
                if($rootScope.site){
                    Smartgeo.selectSiteRemotely($rootScope.site.id, success, error);
                } else {
                    (success || function(){})();
                }
            }).error(function(){
                Smartgeo._LOGIN_MUTEX = false ;
                (error || function(){})();
            });
        },

        // GETTER AND SETTER
        get: function(parameter){
            return JSON.parse(localStorage.getItem(parameter));
        },

        set: function(parameter, value){
            return localStorage.setItem(parameter, JSON.stringify(value));
        },

        unset: function(parameter){
            return localStorage.removeItem(parameter);
        },

        // ASYNC GETTER AND SETTER
        get_: function(parameter, callback){
            IndexedDB.get(parameter, callback);
        },

        set_: function(parameter, value, callback){
            IndexedDB.set(parameter, value, callback);
        },

        unset_: function(parameter, callback){
            IndexedDB.unset(parameter);
        }
    };

    // Initialization
    if(!Smartgeo.get('url') && $location.path() !== '/'){
        $location.path('/');
    }

    Smartgeo._initializeGlobalEvents();
    window.Smartgeo = Smartgeo;
    return Smartgeo ;

});
