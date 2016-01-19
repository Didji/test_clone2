angular.module( 'smartgeomobile' ).factory( 'Installer', function(SQLite, G3ME, $http, $rootScope, $timeout, $route, Storage, Site, Asset, i18n, Relationship, Utils, Authenticator) {

    'use strict';

    var Installer = {

        _LAST_ID_OKEY: {},
        _INSTALL_MAX_ASSETS_PER_HTTP_REQUEST: 1000,
        _INSTALL_MAX_ASSETS_PER_ZONE: 4096,
        _INSTALL_MAX_ASSETS_PER_INSERT_REQUEST: 500,
        _INSTALL_MAX_ASSETS_PER_DELETE_REQUEST: 999,
        _INSTALL_MAX_ZONES_MATRIX_LENGTH: 4,
        _DB_ERR: false,

        //constantes pour l'affichage du message d'information affiché au lancement de
        //l'install si on détecte de potentiels pbs de places (bcp d'objets, moins de XX Mo dispo sur le terminal...)
        //cf ckeckInstall
        _INSTALL_MAX_OBJECTS_THRESHOLD: 750000, //on affiche un warning au dela de cer nb d'objets
        _INSTALL_MIN_AVAILABLE_SPACE: 1000, //espace restant sur le terminal en Mo
        _INSTALL_MAX_DENSITY: 50000, //densité indiquant un nombre d'objet par zones


        deleteAssets: function(site, obsoletes, callback) {
            var assets = [];
            if (!obsoletes && site.obsoletes) {
                obsoletes = site.obsoletes;
            }
            for (var okey in obsoletes) {
                if (obsoletes.hasOwnProperty( okey )) {
                    assets = assets.concat( obsoletes[okey] );
                }
            }
            if (assets.length <= 0) {
                callback();
            } else {
                var request = ' DELETE FROM ASSETS WHERE id in ( "' + assets.join( '","' ) + '" ) ';
                for (var i = 0; i < site.zones.length; i++) {
                    SQLite.openDatabase( {
                        name: site.zones[i].database_name
                    } ).transaction( function(transaction) {
                        transaction.executeSql( request, [], function() {
                            Installer.checkpoint( "_remove_assets_", site.zones.length, callback );
                        } );
                    } );
                }
            }
        },

        formatSiteMetadata: function(site, update) {
            var metamodel = {},
                lists = {},
                symbology = {},
                activities = [],
                stats = [],
                i = 0,
                okey;

            for (i = 0; i < site.metamodel.length; i++) {
                if (update || site.number[site.metamodel[i].okey] !== 0) {
                    metamodel[site.metamodel[i].okey] = site.metamodel[i];
                }
            }
            site.metamodel = angular.copy( metamodel );

            for (okey in metamodel) {
                if (metamodel[okey].is_project) {
                    site.metamodel['PROJECT_' + okey] = metamodel[okey];
                    site.metamodel['PROJECT_' + okey].okey = 'PROJECT_' + okey;
                    site.metamodel['PROJECT_' + okey].group = i18n.get( "_PROJECTS_PROJECT_" ) + " - " + site.metamodel['PROJECT_' + okey].group;
                    site.metamodel['PROJECT_' + okey].label = i18n.get( "_PROJECTS_PROJECT_" ) + " - " + site.metamodel['PROJECT_' + okey].label;
                    site.metamodel[okey].is_project = false;
                }
            }
            for (okey in site.dependancies) {
                site.dependancies["PROJECT_" + okey] = "PROJECT_" + site.dependancies[okey];
            }

            activities._byId = [];
            for (i = 0; i < site.activities.length; i++) {
                if (update || site.number[site.activities[i].okeys[0]] !== 0) {
                    activities.push( site.activities[i] );
                    activities._byId[site.activities[i].id] = site.activities[i];
                }
            }
            site.activities = activities;

            for (var key in site.lists) {
                if (site.lists.hasOwnProperty( key )) {
                    lists[key] = site.lists[key];
                }
            }
            site.lists = lists;

            for (i = 0; i < site.symbology.length; i++) {
                var symbolId = site.symbology[i].okey + '' + site.symbology[i].classindex + '';
                symbology[symbolId] = site.symbology[i];
            }
            site.symbology = symbology;

            for (okey in site.number) {
                if (site.number.hasOwnProperty( okey ) && okey !== 'total' && site.number[okey] !== 0 && site.number[okey] !== "0") {
                    stats.push( {
                        'okey': okey,
                        'amount': site.number[okey]
                    } );
                }
            }
            site.stats = stats;

            delete site.assets;

            var relationship = site.relationship;

            Relationship.eraseAll( function() {
                Relationship.save( relationship );
            } );

            delete site.relationship;

            return site;
        },

        getInstallJSON: function(site, callback) {
            var url = Utils.getServiceUrl( 'gi.maintenance.mobility.installation.json', {
                'site': site.id
            } );

            $http.get( url )
                .success( callback )
                .error( function(response, code) {
                    console.error( response, code );
                } );
        },

        getUpdateJSON: function(site, callback) {
            var url = Utils.getServiceUrl( 'gi.maintenance.mobility.installation.json', {
                'site': site.id,
                'timestamp': site.timestamp
            } );

            $http.get( url )
                .success( callback )
                .error( function(response, code) {
                    (callback || function() {})();
                }
            );
        },

        saveSite: function(site, callback) {
            SQLite.exec( "parameters", "DELETE FROM PROJECTS WHERE 1=1" );
            Storage.get_( 'sites', function(sites) {
                for (var i = 0; i < site.zones.length; i++) {
                    SQLite.openDatabase( {
                        name: site.zones[i].database_name
                    } ).transaction( function(tx) {
                        tx.executeSql( 'CREATE INDEX IF NOT EXISTS IDX_ASSETS_ID ON ASSETS (id)', [], function(tx, result) {
                            tx.executeSql( 'CREATE INDEX IF NOT EXISTS IDX_ASSETS ON ASSETS (xmin , xmax , ymin , ymax, symbolId , minzoom , maxzoom)', [], function(tx, result) {
                                //OK
                            }, function(tx, err) {
                                console.error( "SQL ERROR " + err.code + " on " + site.zones[i].database_name + " : " + err.message );
                            } );
                        }, function(tx, err) {
                            console.error( "SQL ERROR " + err.code + " on " + site.zones[i].database_name + " : " + err.message );
                        } );
                    }, function(err) {
                        console.error( "TX ERROR " + err.code + " on " + site.zones[i].database_name + " : " + err.message );
                    } );
                }
                sites = sites || {};
                delete site.number;
                delete site.obsoletes;
                delete site.stats;
                sites[site.id] = site;
                Storage.set_( 'sites', sites, function() {
                    (callback || angular.noop) ( sites );
                } );
            } );
        },

        createZones: function(site, callback) {
            var zones_matrix_length = Math.ceil( Math.sqrt( Math.pow( 2, Math.ceil( Math.log( site.number.total / Installer._INSTALL_MAX_ASSETS_PER_ZONE ) / Math.LN2 ) ) ) );
            zones_matrix_length = Math.min( zones_matrix_length, Installer._INSTALL_MAX_ZONES_MATRIX_LENGTH );
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
                    site.zones.push( {
                        extent: extent,
                        assets: [],
                        insert_requests: [],
                        table_name: site.id + JSON.stringify( extent ).replace( /\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, '' ),
                        database_name: site.id + JSON.stringify( extent ).replace( /\.|-|{|}|,|:|xmin|xmax|ymin|ymax|"/g, '' )
                    } );
                }
            }

            for (i = 0; i < site.zones.length; i++) {
                SQLite.openDatabase( {
                    name: site.zones[i].database_name
                } ).transaction( function(transaction) {
                    transaction.executeSql( 'DROP TABLE IF EXISTS ASSETS' );
                    transaction.executeSql( 'CREATE TABLE IF NOT EXISTS ASSETS (id, xmin real, xmax real, ymin real, ymax real, geometry, symbolId,  angle, label, maplabel, minzoom integer, maxzoom integer, asset)', [], function() {
                        Installer.checkpoint( "create_zones_databases_", site.zones.length, callback );
                    } );
                } );
            }

            return site;
        },

        checkpoint: function(attribute, treeshold, callback) {
            Installer[attribute] = 1 * (Installer[attribute] || 0) + 1;
            if (Installer[attribute] >= treeshold) {
                Installer[attribute] = 0;
                return callback();
            } else {
                return false;
            }
        },

        install: function(site, stats, callback, update) {
            if (!stats.length) {
                return callback();
            }

            Installer.installOkey( site, stats[0], function() {
                Installer.install( site, stats.slice( 1 ), callback, update );
            }, update );
        },

        update: function(site, callback, onlySite) {
            $rootScope.dailyUpdate = true;
            callback = callback || function() {};
            Installer.getUpdateJSON( site, function(site) {
                if (!site) {
                    $rootScope.dailyUpdate = false;
                    callback();
                    return;
                }
                var formatedSite = Installer.formatSiteMetadata( site, true );
                Site.current.oldTimestamp = Site.current.timestamp;
                angular.extend( Site.current, formatedSite );
                if (onlySite) {
                    Site.save( Site.current, function() {
                        $rootScope.dailyUpdate = false;
                        if (!$rootScope.$$phase) {
                            $rootScope.$digest();
                        }
                        alertify.log( i18n.get( '_UPDATE_SITE_END' ) );
                        callback();
                    } );
                    return;
                }
                Installer.deleteAssets( Site.current, site.obsoletes, function() {
                    Installer.install( Site.current, site.stats, function() {
                        Site.save( Site.current, function() {
                            $rootScope.dailyUpdate = false;
                            if (!$rootScope.$$phase) {
                                $rootScope.$digest();
                            }
                            alertify.log( i18n.get( '_UPDATE_ALL_END' ) );
                            callback();
                        } );
                        Asset.cache = {};
                        (G3ME.canvasTile && G3ME.reloadLayers)();
                    }, true );
                } );
            } );
        },

        installOkey: function(site, objectType, callback, update) {
            $rootScope.$broadcast( "_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", {
                okey: objectType.okey,
                progress: 0
            } );

            if (objectType.amount === 0 || objectType.amount === "0") {
                return callback();
            }

            if (objectType.amount > Installer._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST) {
                Installer.installOkeyPerSlice( site, objectType, 0, callback, update );
            } else {
                var url = Utils.getServiceUrl( 'gi.maintenance.mobility.installation.assets.json', {
                    okey: objectType.okey
                } );
                if (update) {
                    url += '&timestamp=' + site.oldTimestamp;
                }

                $http
                    .get( url )
                    .success( function(data) {
                        Installer.save( site, data.assets, function() {
                            $rootScope.$broadcast( "_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", {
                                okey: objectType.okey,
                                progress: objectType.amount
                            } );
                            $timeout( function() {
                                callback();
                            }, 100 );
                        } );
                    } )
                    .error( function() {
                        $timeout( function() {
                            Installer.installOkey( site, objectType, callback, update );
                        }, 100 );
                    } );
            }
        },

        installOkeyPerSlice: function(site, objectType, lastFetched, callback, update) {
            if (lastFetched >= objectType.amount) {
                return callback();
            }
            var newlastFetched = lastFetched + Installer._INSTALL_MAX_ASSETS_PER_HTTP_REQUEST,
                url = Storage.get( 'url' ) + 'gi.maintenance.mobility.installation.assets.json';

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
                .get( url )
                .success( function(data) {
                    if (!data.assets || !data.assets.length) {
                        Installer.installOkeyPerSlice( site, objectType, newlastFetched, callback, update );
                        return;
                    }
                    Installer._LAST_ID_OKEY[objectType.okey] = data.assets[data.assets.length - 1] ? data.assets[data.assets.length - 1].guid : Installer._LAST_ID_OKEY[objectType.okey];
                    Installer.save( site, data.assets, function() {
                        $rootScope.$broadcast( "_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", {
                            okey: objectType.okey,
                            progress: Math.min( newlastFetched, objectType.amount )
                        } );
                        $timeout( function() {
                            Installer.installOkeyPerSlice( site, objectType, newlastFetched, callback, update );
                        }, 100 );
                    } );
                } ).error( function() {
                $timeout( function() {
                    Installer.installOkeyPerSlice( site, objectType, lastFetched, callback, update );
                }, 100 );
            } );
        },

        save: function(site, assets, callback) {
            site.zones = Asset.__distributeAssetsInZone( assets, site );
            Installer.save_zones_to_database( site, function() {
                Installer.clean_zones( site );
                callback();
            } );
        },

        clean_zones: function(site) {
            for (var i = 0; i < site.zones.length; i++) {
                if (site.zones[i].assets) {
                    site.zones[i].assets_count = (site.zones[i].assets_count || 0) + site.zones[i].assets.length;
                    site.zones[i].assets = [];
                    site.zones[i].insert_requests = [];
                }
            }
        },

        save_zones_to_database: function(site, callback) {
            for (var i = 0; i < site.zones.length; i++) {
                ( function(i) {
                    var temp_zone, sub_zone,
                        zone = site.zones[i];
                    if (zone.assets) {
                        temp_zone = zone.assets;
                    } else {
                        return Installer.checkpoint( "saved_zones", site.zones.length, callback );
                    }
                    while (temp_zone.length) {
                        sub_zone = temp_zone.slice( 0, Installer._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST );
                        zone.insert_requests.push( Asset.__buildRequest( sub_zone, site ) );
                        temp_zone = temp_zone.slice( Installer._INSTALL_MAX_ASSETS_PER_INSERT_REQUEST );
                    }
                    Installer.execute_requests_for_zone( site, zone, function() {
                        Installer.checkpoint( "saved_zones", site.zones.length, callback );
                    } );
                } ) ( i );
            }
        },

        execute_requests_for_zone: function(site, zone, callback) {
            if (zone.insert_requests.length === 0) {
                return Installer.checkpoint( "rqst" + zone.table_name, zone.insert_requests.length, callback );
            }

            for (var i = 0; i < zone.insert_requests.length; i++) {
                ( function(zone, request) {
                    SQLite.openDatabase( {
                        name: zone.database_name
                    } ).transaction( function(transaction) {
                        transaction.executeSql( request.request, request.args, function() {
                            Installer.checkpoint( "rqst" + zone.table_name, zone.insert_requests.length, callback );
                            return;
                        }, function(tx, err) {
                            console.error( err.message );
                            Installer.checkpoint( "rqst" + zone.table_name, zone.insert_requests.length, callback );
                        } );
                    }, function(err) {
                        //callback d'erreur de transaction, cf http://www.w3.org/TR/webdatabase/#sqlerror
                        console.error( "TX error " + err.code + " on DB " + zone.database_name + " : " + err.message );
                        if (!Installer._DB_ERR) {
                            Installer._DB_ERR = true;
                            var msg = i18n.get( '_INSTALL_ERR', err.code );
                            if (err.code == err.QUOTA_ERR) {
                                msg = i18n.get( '_INSTALL_QUOTA_ERR' );
                            }
                            alertify.alert( msg ); //TODO: en 2.0/full web view, quitter l'application sur le callback de confirmation
                        //du message pour être ISO à la 1.2.4 (dev spé Veolia) ou trouver une autre solution
                        }
                    } );
                } ) ( zone, zone.insert_requests[i] );
            }
        },

        uninstallSite: function(site, callback) {
            for (var i = 0; site && i < site.zones.length; i++) {
                SQLite.openDatabase( {
                    name: site.zones[i].database_name
                } ).transaction( function(transaction) {
                    transaction.executeSql( 'DROP TABLE IF EXISTS ASSETS', [], function() {
                        Installer.checkpoint( "destroy_zones_databases", site.zones.length, callback );
                    } );
                } );
            }
        },

        checkInstall: function(site, callback) {
            callback = callback || function() {};
            //TODO: en 2.0/full web view, implémenter l'algo ci-dessous, demandé par Veolia en 1.2.4
            //SI TOUJOURS D'ACTUALITE (peut être plus de pb de place car la 2.0 affiche un message pour agumenter les quotas si besoin par ex...)
            if (window.SmartgeoChromium) {
                ChromiumCallbacks[1000] = function(bytesAvailable) {
                    if (site.number.total > Installer._INSTALL_MAX_OBJECTS_THRESHOLD ||
                        (site.number.total / site.zones.length) > Installer._INSTALL_MAX_DENSITY ||
                        ((bytesAvailable / 1024) / 1024) < Installer._INSTALL_MIN_AVAILABLE_SPACE) {
                        alertify.alert( i18n.get( '_INSTALL_SPACE_WARNING' ), function() {
                            callback();
                        } );
                    } else {
                        callback();
                    }
                };
                SmartgeoChromium.getAvailableSpace();
            } else {
                callback();
            }
        }
    };

    return Installer;
} );
