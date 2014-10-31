/**
 * @class       Smartgeo
 * @classdesc   Noyau et fourre tout
 *
 * @property {string}   _SMARTGEO_MOBILE_VERSION
 * @property {number}   _BIG_SCREEN_THRESHOLD
 * @property {number}   _SIDE_MENU_WIDTH
 * @property {number}   _MAX_RESULTS_PER_SEARCH
 * @property {number}   _SERVER_UNREACHABLE_THRESHOLD
 * @property {number}   _MAX_MEDIA_PER_REPORT
 * @property {number}   _MAX_ID_FOR_SELECT_REQUEST
 * @property {boolean}  _DONT_REALLY_RESET
 * @property {object}   parametersCache
 * @property {object}   parametersCache_
 * @property {array}    positionListerners
 * @property {number}   locationWatchIdentifier
 */

angular.module('smartgeomobile').factory('Smartgeo', function ($http, $window, $rootScope, SQLite, Storage, Site) {

    'use strict';

    var Smartgeo = {

        initialize: function () {

            this._SMARTGEO_MOBILE_VERSION = $rootScope.version = window.smargeomobileversion + (window.smargeomobilebuild && window.smargeomobilebuild.length ? "-" + window.smargeomobilebuild : '');
            this._SIDE_MENU_WIDTH = ($window.outerWidth || $window.screen.width) > 361 ? 300 : ($window.outerWidth || $window.screen.width) * 0.8;
            this._BIG_SCREEN_THRESHOLD = 2 * this._SIDE_MENU_WIDTH;
            this._MAX_RESULTS_PER_SEARCH = 10;
            this._SERVER_UNREACHABLE_THRESHOLD = 10000;
            this._MAX_MEDIA_PER_REPORT = $rootScope._MAX_MEDIA_PER_REPORT = 3;
            this._MAX_ID_FOR_SELECT_REQUEST = 4000;
            this._DONT_REALLY_RESET = $rootScope.rights && $rootScope.rights._DONT_REALLY_RESET ;
            this.parametersCache = {};
            this.parametersCache_ = window.smartgeoPersistenceCache_ || {};
            this.positionListerners = [];
            this.locationWatchIdentifier = null;

            Smartgeo._initializeGlobalEvents();
            Smartgeo.clearPersistence();

            if (window.SmartgeoChromium) {
                window.ChromiumCallbacks[13] = function (path) {
                    if (path) {
                        Storage.set('tileRootPath', path);
                    } else {
                        SmartgeoChromium.getExtApplicationDirectory();
                    }
                };
                SmartgeoChromium.getExtApplicationDirectory();
            }

            window.Smartgeo = Smartgeo;

            $rootScope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

            return this;
        },

        /**
         * @memberOf Smartgeo
         * @returns {boolean} is smartgeo running on little screen
         * @desc Return true if device width is < to {@link smartgeomobile.Smartgeo#_BIG_SCREEN_THRESHOLD Smartgeo.\_BIG\_SCREEN\_THRESHOLD}
         */
        isRunningOnLittleScreen: function () {
            return ($window.outerWidth < Smartgeo._BIG_SCREEN_THRESHOLD);
        },

        /**
         * @memberOf Smartgeo
         * @param {string} url gimap server url
         * @returns {string} url setted server url
         * @desc Set Gimap serveur URL on localstorage, add **`http://`** and **`/index.php?service=`** if needed and clear localStorage
         */
        setGimapUrl: function (url) {
            if (url === null) {
                return null;
            }
            if (url.indexOf('http') === -1) {
                url = 'http://' + url;
            }
            if (url.indexOf('index.php?service=') === -1) {
                url = url + '/index.php?service=';
            }
            Smartgeo.reset();
            Storage.set('url', url);
            return url;
        },

        /**
         * @memberOf Smartgeo
         * @desc Clear localStorage
         */
        reset: function () {

            if (Smartgeo._DONT_REALLY_RESET) {
                return;
            }

            Smartgeo.clearPersistence();
            Smartgeo.clearCaches();

            for (var val in localStorage) {
                if (val.indexOf("LicenseManager") !== 0) {
                    localStorage.removeItem(val);
                }
            }

            var sites = Storage.get_('sites');
            Storage.remove_('sites');
            for (var k in sites) {
                var site = sites[k];
                for (var i = 0; site.zones && i < site.zones.length; i++) {
                    SQLite.openDatabase({
                        name: site.zones[i].database_name
                    }).transaction(function (transaction) {
                        transaction.executeSql('DROP TABLE IF EXISTS ASSETS');
                    });
                }
            }
        },

        /**
         * @memberOf Smartgeo
         * @desc Clear localStorage
         */
        clearCaches: function () {
            Smartgeo.parametersCache = {};
            this.parametersCache_ = {};
        },


        /**
         * @memberOf Smartgeo
         * @param {string} serviceName Name of called Service
         * @param {Object} GETParameters Associative array of get parameters name=>value
         * @returns {string} url Well formatted URL
         * @desc Get ready to call URL with a service's name and list of parameters
         * @example
         * Smartgeo.getServiceUrl('gi.maintenance.mobility.installation.json', {
         *     'site'      : site.id,
         *     'timestamp' : site.timestamp
         * });
         */
        getServiceUrl: function (serviceName, GETParameters) {
            var url = Storage.get('url');
            url += serviceName;

            for (var parameter in GETParameters) {
                if (GETParameters.hasOwnProperty(parameter)) {
                    url += '&' + parameter + '=' + GETParameters[parameter];
                }
            }

            return url;
        },

        /**
         * @memberOf Smartgeo
         * @param {function} callback Called with boolean which depends on gimap reachability
         * @desc Call global.dcnx.json gimap service to know if it is reachable. So this method logout current user.
         * It may be refactored when a real ping service will be available on gimap
         * @example
         * Smartgeo.ping(function(gimapIsReachable){
         *     if(gimapIsReachable){
         *         // do things
         *     }
         * });
         */
        ping: function (callback) {
            callback = callback || angular.noop;
            $http.post(Smartgeo.getServiceUrl('global.dcnx.json'), {}, {
                    timeout: Smartgeo._SERVER_UNREACHABLE_THRESHOLD
                })
                .success(function () {
                    Storage.set('online', true);
                    callback(true);
                }).error(function () {
                    Storage.set('online', false);
                    callback(false);
                });
        },

        /**
         * @memberOf Smartgeo
         * @param {string} asset serialized asset
         * @returns {Object} Satitized parsed asset
         * @desc Sanitize asset eg. replace horrible characters
         */
        sanitizeAsset: function (asset) {
            return JSON.parse(asset.replace(/&#039;/g, "'").replace(/\\\\/g, "\\"));
        },

        findGeometryByGuids_big: function (site, guids, callback, partial_response) {
            partial_response = partial_response || [];
            if (guids.length === 0) {
                return callback(partial_response);
            } else {
                Smartgeo.findGeometryByGuids(site, guids.slice(0, Smartgeo._MAX_ID_FOR_SELECT_REQUEST), function (assets) {
                    Smartgeo.findGeometryByGuids_big(site, guids.slice(Smartgeo._MAX_ID_FOR_SELECT_REQUEST), callback, partial_response.concat(assets));
                });
            }
        },

        findGeometryByGuids: function (site, guids, callback, zones, partial_response) {
            if (guids.length > Smartgeo._MAX_ID_FOR_SELECT_REQUEST) {
                return Smartgeo.findGeometryByGuids_big(site, guids, callback);
            }

            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
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

            var _this = this,
                request = 'SELECT id, label, geometry, xmin, xmax, ymin, ymax FROM ASSETS WHERE id in ( ' + guids.join(',') + ')';
            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function (t) {
                t.executeSql('CREATE INDEX IF NOT EXISTS IDX_RUSTINE ON ASSETS (id)');
                t.executeSql(request, [],
                    function (tx, rslt) {
                        var asset;
                        for (var i = 0; i < rslt.rows.length; i++) {
                            asset = rslt.rows.item(i);
                            partial_response.push({
                                guid: asset.id,
                                label: asset.label,
                                geometry: JSON.parse(asset.geometry),
                                xmin: asset.xmin,
                                xmax: asset.xmax,
                                ymin: asset.ymin,
                                ymax: asset.ymax
                            });
                        }
                        _this.findGeometryByGuids(site, guids, callback, zones.slice(1), partial_response);
                    },
                    function (tx, SqlError) {
                        console.error(SqlError.message);
                        alertify.log(SqlError.message);
                    });
            }, function (SqlError) {
                console.error(SqlError.message);
                alertify.log(SqlError.message);
            });
        },

        findAssetsByGuids: function (site, guids, callback, zones, partial_response) {

            if (guids.length > Smartgeo._MAX_ID_FOR_SELECT_REQUEST) {
                return Smartgeo.findAssetsByGuids_big(site, guids, callback);
            }

            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
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

            var _this = this,
                request = 'SELECT * FROM ASSETS WHERE id ' + (guids.length === 1 ? ' = ' + guids[0] : 'in ( ' + guids.join(',') + ')');

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function (t) {
                t.executeSql('CREATE INDEX IF NOT EXISTS IDX_RUSTINE ON ASSETS (id)');
                t.executeSql(request, [],
                    function (tx, rslt) {
                        for (var i = 0; i < rslt.rows.length; i++) {
                            var ast = angular.copy(rslt.rows.item(i));
                            ast.okey = JSON.parse(ast.asset.replace(new RegExp('\n', 'g'), ' ')).okey;
                            ast.guid = ast.id;
                            ast.geometry = JSON.parse(ast.geometry);
                            partial_response.push(ast);
                        }
                        _this.findAssetsByGuids(site, guids, callback, zones.slice(1), partial_response);
                    },
                    function (tx, SqlError) {
                        console.error(SqlError.message);
                        console.error(request);
                        alertify.log(SqlError.message);
                    });
            }, function (SqlError) {
                console.error(SqlError);
                console.error(request);
            });
        },

        findAssetsByLabel: function (site, label, callback, zones, partial_response) {
            if (!zones) {
                zones = site.zones;
                partial_response = [];
            }

            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
                return callback([]);
            }

            if (!zones.length) {
                partial_response.sort(function (a, b) {
                    return (a.label < b.label) ? -1 : 1;
                });
                return callback(partial_response);
            }

            var request = 'SELECT * FROM ASSETS WHERE label like ? limit 0, 10',
                _this = this;

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function (t) {
                t.executeSql(request, ["%" + label + "%"],
                    function (t, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            var asset = angular.copy(results.rows.item(i));
                            asset.label = asset.label.replace(/&#039;/g, "'").replace(/\\\\/g, "\\");
                            asset.okey = Smartgeo.sanitizeAsset(asset.asset).okey;
                            partial_response.push(asset);
                        }
                        _this.findAssetsByLabel(site, label, callback, zones.slice(1), partial_response);
                    },
                    function (tx, SqlError) {
                        console.error(SqlError, request);
                    },
                    function (tx, SqlError) {
                        console.error(SqlError, request);
                    });
            }, function (tx, SqlError) {
                console.error(SqlError, request);
            });
        },

        findAssetsByCriteria: function (site, search, callback, zones, partial_response, request) {
            if (!zones) {
                zones = site.zones;
                partial_response = [];
                console.time('Recherche');
            }


            if (window._SMARTGEO_STOP_SEARCH) {
                window._SMARTGEO_STOP_SEARCH = false;
                return callback([]);
            }
            if (!zones.length || partial_response.length >= Smartgeo._MAX_RESULTS_PER_SEARCH) {
                console.timeEnd('Recherche');
                return callback(partial_response);
            }

            if (!request) {

                request = 'SELECT * FROM assets WHERE symbolid REGEXP(\'' + search.okey + '.*\') ';

                var regex;

                for (var criter in search.criteria) {
                    if (search.criteria.hasOwnProperty(criter) && search.criteria[criter]) {
                        if (search.criteria[criter] === 1 * search.criteria[criter]) {
                            regex = "'.*\"" + criter.toLowerCase() + "\":" + search.criteria[criter] + "?[,\\}].*'";
                        } else {
                            regex = "'.*\"" + criter.toLowerCase() + "\":\"[^\"]*" + search.criteria[criter].toLowerCase() + ".*'";
                        }
                        request += " AND LOWER(asset) REGEXP(" + regex + ") ";
                    }
                }
                request += ' LIMIT ' + (Smartgeo._MAX_RESULTS_PER_SEARCH - partial_response.length);
            }

            SQLite.openDatabase({
                name: zones[0].database_name
            }).transaction(function (t) {
                    t.executeSql(request, [],
                        function (t, results) {
                            for (var i = 0; i < results.rows.length; i++) {
                                var asset = results.rows.item(i);
                                try {
                                    asset.okey = Smartgeo.sanitizeAsset(asset.asset).okey;
                                } catch (e) {
                                    console.error(e);
                                    console.error(asset.asset);
                                }
                                partial_response.push(asset);
                            }
                            Smartgeo.findAssetsByCriteria(site, search, callback, zones.slice(1), partial_response, request);
                        },
                        function (tx, SqlError) {
                            console.error(SqlError);
                        },
                        function (tx, SqlError) {
                            console.error(SqlError);
                        });
                },
                function (tx, SqlError) {
                    console.error(SqlError);
                });
        },

        _initializeGlobalEvents: function () {
            window.addEventListener('online', Smartgeo._onlineTask, false);
            window.addEventListener('offline', Smartgeo._offlineTask, false);

            if (!window.ChromiumCallbacks) {
                window.ChromiumCallbacks = {};
            }

            window.ChromiumCallbacks[20] = Smartgeo._onlineTask;
            window.ChromiumCallbacks[21] = Smartgeo._offlineTask;
        },

        _onlineTask: function () {
            setTimeout(function () {
                Storage.set('online', true);
                $rootScope.$broadcast("DEVICE_IS_ONLINE");
                console.info(("_SMARTGEO_ONLINE"));
                Smartgeo.silentLogin();
            }, 1000);
        },

        _offlineTask: function () {
            Storage.set('online', false);
            $rootScope.$broadcast("DEVICE_IS_OFFLINE");
            console.info(("_SMARTGEO_OFFLINE"));
        },

        silentLogin: function (callback) {
            var user = (Storage.get('users') || {})[Storage.get('lastUser')];
            if (user && user.token) {
                Smartgeo.login(user.token, callback);
            } else if (user && user.username && user.password) {
                Smartgeo.login(user.username, user.password, callback);
            }
        },

        rustineVeolia: function (sites, success, error) {
            for (var i in sites) {
                var site = sites[i];
                if (Site.current && site && (site.id === Site.current.id) && site.url && site.url.indexOf('veoliagroup') !== -1) {
                    var url = (Storage.get('url') || '').replace(/^(https?:\/\/.+)index\.php.*$/, '$1') + site.url;
                    $http.get(url).then(success, error);
                }
            }

        },

        selectSiteRemotely: function (site, success, error) {

            if (window.SmartgeoChromium) {
                var user = (Storage.get('users') || {})[Storage.get('lastUser')];
                ChromiumCallbacks[16] = function () {};
                SmartgeoChromium.authenticate(Smartgeo.getServiceUrl('global.auth.json'), user.username, user.password, site);
            }

            var url = Smartgeo.getServiceUrl('global.auth.json', {
                'app': 'mapcite',
                'site': site,
                'auto_load_map': true
            });

            $http.post(url).then(success || angular.noop, error || angular.noop);
        },
        login_o: function (user, success, error) {
            // TODO : MERGE WITH LOGIN METHOD
            if (user.token) {
                Smartgeo.login(user.token, success, error);
            } else {
                Smartgeo.login(user.username, user.password, success, error);
            }
        },
        login: function (login, password, success, error) {
            if (Smartgeo._LOGIN_MUTEX) {
                return (error || angular.noop)();
            }

            Smartgeo._LOGIN_MUTEX = true;
            var token, url;
            if (typeof password === 'function' || !password) {
                token = login;
                error = success;
                success = password;
            }
            if (token) {
                url = Smartgeo.getServiceUrl('global.auth.json', {
                    'token': encodeURIComponent(token),
                    'mobility': true
                });
            } else {
                url = Smartgeo.getServiceUrl('global.auth.json', {
                    'login': encodeURIComponent(login),
                    'pwd': encodeURIComponent(password),
                    'forcegimaplogin': true
                });
            }
            $http.post(url, {}, {
                timeout: Smartgeo._SERVER_UNREACHABLE_THRESHOLD
            }).success(function () {
                Smartgeo._LOGIN_MUTEX = false;
                if (Site.current) {
                    Smartgeo.selectSiteRemotely(Site.current.id, success, error);
                    (success || angular.noop)();
                } else {
                    (success || angular.noop)();
                }
            }).error(function (response, status) {
                Smartgeo._LOGIN_MUTEX = false;
                (error || angular.noop)(response, status);
            });

        },

        /**
         * @name tokenAuth
         * @desc Fonction d'authentification par token
         */
        tokenAuth: function(token, callback, callback2) {
            var currentUser = (Storage.get('users') || {})[Storage.get('lastUser')] || {};
            currentUser.token = token;
            Storage.set('user', currentUser);

            Smartgeo.login(token, callback, function (response) {
                if ((response && response.status === 200) || !response) {
                    callback();
                } else {
                    callback2();
                }
            }, callback2);
        },

        clearPersistence: function () {
            clearTimeout(Smartgeo.lastLeafletMapExtentTimeout);
            Storage.remove('persitence.menu.open');
            Storage.remove('persitence.menu.open.level');

            if (!(Storage.get('users') || {})[Storage.get('lastUser')]) {
                return;
            }
            var missions = Storage.get('missions_' + (Storage.get('users') || {})[Storage.get('lastUser')].username);
            for (var i in missions) {
                missions[i].openned = false;
            }
            if (missions) {
                Storage.set('missions_' + (Storage.get('users') || {})[Storage.get('lastUser')].username, missions);
            }
        },

        /**
         * @name pad
         * @param {Number} number
         * @desc Rajoute un 0 au nombre inférieur à 10
         */
        pad: function(number){
            return (number < 10) ? ('0' + number) : number;
        },

        /**
         * @name getBase64Image
         * @param {String} src
         */
        getBase64Image :function (src) {
            var img = document.createElement("img");
            img.src = src;
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL("image/jpeg", 50);
            return dataURL;
        },

        // Fonction utilitaire créant un contrôle Leaflet.
        makeControl :function (title, icon, onclick) {
            var Constr = L.Control.extend({
                options: {
                    position: 'topright'
                },
                onAdd: function () {
                    var container = L.DomUtil.create('div', 'leaflet-bar');
                    $(container)
                        .html('<a href="#" title="' + title + '"><span class="fa ' + icon + '"></span></a>')
                        .on('click', onclick);
                    return container;
                }
            });
            return new Constr();
        },


        sleep: function (millis, callback) {
            setTimeout(callback, millis);
        }
    };

    return Smartgeo.initialize();

});
