angular.module('smartgeomobile', [])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when('/',                                       {templateUrl: 'partials/login.html'}).
            when('/sites/',                                 {templateUrl: 'partials/sites.html'}).

            when('/report/:site',                           {templateUrl: 'partials/report.html'}).
            when('/report/:site/:activity',                 {templateUrl: 'partials/report.html'}).
            when('/report/:site/:activity/:assets',      {templateUrl: 'partials/report.html'}).

            when('/sites/install/:site',                    {templateUrl: 'partials/installation.html'}).
            when('/map/:site',                              {templateUrl: 'partials/map.html'}).
            otherwise({redirectTo: '/'});
        }]
    )
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.withCredentials = true;
        $httpProvider.defaults.useXDomain = true;
        // delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }])
    .factory('G3ME', function(SQLite){
        var G3ME = {
            extents_match : function(extent1, extent2){
                return extent1.xmax > extent2.xmin &&
                    extent2.xmax > extent1.xmin &&
                    extent1.ymax > extent2.ymin &&
                    extent2.ymax > extent1.ymin;
            },
            drawTile : function(map, site, canvas, tilePoint) {
                var ctx = canvas.getContext('2d');
                var zoom = map.getZoom(),
                    crs = L.CRS.EPSG4326,
                    nwPoint = tilePoint.multiplyBy(256),
                    sePoint = nwPoint.add(new L.Point(256, 256)),
                    nw = crs.project(map.unproject(nwPoint, zoom)),
                    se = crs.project(map.unproject(sePoint, zoom)),
                    nwmerc = map.latLngToLayerPoint({
                        lat: nw.y,
                        lng: nw.x
                    }),
                    margin = 0.00005,
                    ymin = se.y - margin,
                    ymax = nw.y + margin,
                    xmin = nw.x - margin,
                    xmax = se.x + margin,
                    _2pi = 2 * Math.PI,
                    _pi4 = Math.PI / 4,
                    dotSize = Math.floor(0.5 + (7 / (19 - zoom))),
                    parse = window.JSON.parse,
                    symbology = site.symbology,
                    imageFactor = Math.floor(30 / (22 - zoom)) / 10,
                    imageFactor_2 = imageFactor / 2,
                    scale = 256 * Math.pow(2, zoom),
                    xscale = canvas.width / Math.abs(xmax - xmin),
                    yscale = canvas.height / Math.abs(ymax - ymin),
                    initialTopLeftPointX = map._initialTopLeftPoint.x,
                    initialTopLeftPointY = map._initialTopLeftPoint.y,
                    delta_x = initialTopLeftPointX - nwmerc.x,
                    delta_y = initialTopLeftPointY - nwmerc.y,
                    DEG_TO_RAD = Math.PI / 180,
                    buffer = 100 / xscale,
                    drawnLabels = [],
                    labelCache = [],
                    minDistanceToALabel = 15;


                function drawLabel(ctx, txt, size, x, y) {
                    // Anticollision primaire.
                    var cur;
                    for (var i = 0, lim = drawnLabels.length; i < lim; i++) {
                        cur = drawnLabels[i];
                        if ((x < (cur.x + cur.width + minDistanceToALabel)) &&
                            (x > (cur.x - minDistanceToALabel)) &&
                            (y < (cur.y + minDistanceToALabel)) &&
                            (y > (cur.y - minDistanceToALabel))) {
                            return;
                        }
                    }

                    drawnLabels.push({
                        x: x,
                        y: y,
                        width: ctx.measureText(txt).width
                    });

                    ctx.font = (size / 2) + 'px Arial';
                    ctx.strokeText(txt, x + size * imageFactor_2 + 1, y);
                    ctx.fillText(txt, x + size * imageFactor_2 + 1, y);
                }

                function drawLabels(ctx) {
                    var cur;
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 4;
                    for (var i = 0, lim = labelCache.length; i < lim; i++) {
                        cur = labelCache[i];
                        drawLabel(ctx, cur.txt, cur.size, cur.x, cur.y);
                    }
                }

                function addLabel(txt, size, x, y) {
                    labelCache.push({
                        txt: txt,
                        x: x,
                        y: y,
                        size: size
                    });
                }

                // var activeLayer = [];

                // var select = this.$el.find('#layerchoose')[0],
                //     options = select && select.options;

                // for (var i = 0, iLen = options.length; i < iLen; i++) {
                //     if (options[i].selected) {
                //         activeLayer.push(options[i].getAttribute('data-okey').split(' ')[0]);
                //     }
                // }

                var zones = [],
                    initargs = [xmin - buffer, xmax + buffer, ymin - buffer, ymax + buffer, zoom, zoom],
                    finalargs = [],
                    subrequests = [],
                    tileExtent = {
                        ymin: ymin,
                        ymax: ymax,
                        xmin: xmin,
                        xmax: xmax
                    };

                // var request = "SELECT angle, geometry, symbolId, minzoom, maxzoom FROM ASSETS ";
                var request = "SELECT * FROM ASSETS ";
                request += "WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) ";
                request += "      AND ( (minzoom <= 1*? and maxzoom >= 1*? ) or (minzoom IS NULL OR maxzoom IS NULL) ) ";
                // request += activeLayer.length ? ' and (symbolId like "' + activeLayer.join('%" or symbolId like "') + '%" )' : ' and 1=2 ';
                for (i = 0; i < site.zones.length; i++) {
                    if (this.extents_match(site.zones[i].extent, tileExtent)) {
                        SQLite.openDatabase({
                            name: site.zones[i].database_name,
                            bgType: 1
                        })
                            .transaction(function(tx) {
                                tx.executeSql(request, initargs,
                                    function(tx, results) {
                                        var rows = results.rows;
                                        for (var i = 0, length = rows.length; i < length; i++) {
                                            var prevX = false,
                                                prevY = false,
                                                asset = rows.item(i),
                                                geom = parse(asset.geometry),
                                                assetSymbology = symbology[asset.symbolId],
                                                coord, coord_ = {}, x, y, image;
                                            if (geom.type === "MultiLineString") {
                                                geom.coordinates = geom.coordinates[0];
                                            }
                                            if (geom.type === "LineString") {
                                                ctx.beginPath();
                                                for (var j = 0, l = geom.coordinates.length; j < l; j++) {
                                                    coord = geom.coordinates[j];
                                                    if (zoom < 15) {
                                                        coord_.x = Math.floor(0.5 + ((coord[0] - xmin) * xscale));
                                                        coord_.y = Math.floor(0.5 + ((ymax - coord[1]) * yscale));
                                                    } else {
                                                        coord_.x = coord[0] * 0.017453292519943295;
                                                        coord_.y = Math.log(Math.tan(_pi4 + (coord[1] * 0.008726646259971648)));

                                                        coord_.x = scale * (0.15915494309189535 * coord_.x + 0.5);
                                                        coord_.y = scale * (-0.15915494309189535 * coord_.y + 0.5);

                                                        coord_.x = Math.floor(0.5 + coord_.x) - initialTopLeftPointX - nwmerc.x;
                                                        coord_.y = Math.floor(0.5 + coord_.y) - initialTopLeftPointY - nwmerc.y;
                                                    }

                                                    if (prevX === false) {
                                                        ctx.moveTo(coord_.x, coord_.y);
                                                    } else if (coord_.x === prevX && coord_.y === prevY) {
                                                        continue;
                                                    } else {
                                                        ctx.lineTo(coord_.x, coord_.y);
                                                    }

                                                    prevX = coord_.x;
                                                    prevY = coord_.y;
                                                }
                                                ctx.strokeStyle = assetSymbology.style.strokecolor;
                                                ctx.stroke();
                                            } else if (geom.type === "Point") {

                                                coord_.x = geom.coordinates[0] * 0.017453292519943295;
                                                coord_.y = Math.log(Math.tan(_pi4 + (geom.coordinates[1] * 0.008726646259971648)));

                                                coord_.x = scale * (0.15915494309189535 * coord_.x + 0.5);
                                                coord_.y = scale * (-0.15915494309189535 * coord_.y + 0.5);

                                                coord_.x = Math.floor(0.5 + coord_.x) - initialTopLeftPointX - nwmerc.x;
                                                coord_.y = Math.floor(0.5 + coord_.y) - initialTopLeftPointY - nwmerc.y;

                                                image = symbology[asset.symbolId.toString()].style.image;

                                                if (image) {
                                                    ctx.save();
                                                    ctx.translate(coord_.x, coord_.y);
                                                    ctx.rotate(-asset.angle * DEG_TO_RAD);
                                                    ctx.drawImage(image, -image.width * imageFactor_2, -image.height * imageFactor_2,
                                                        image.width * imageFactor,
                                                        image.height * imageFactor);
                                                    ctx.restore();
                                                    if (zoom > 16 && asset.label) {
                                                        addLabel(asset.label, image.width, coord_.x, coord_.y);
                                                    }
                                                } else {
                                                    ctx.beginPath();
                                                    ctx.arc(coord_.x, coord_.y, dotSize, 0, _2pi, true);
                                                    ctx.fillStyle = symbology[asset.symbolId].style.fillcolor;
                                                    ctx.fill();
                                                    ctx.fillText(asset.label, coord_.x + 1, coord_.y + 1);
                                                }
                                            } else {
                                                console.log("géometrie inconnue");
                                            }
                                        }
                                        if (zoom > 16) {
                                            drawLabels(ctx);
                                        }

                                    }, function(SqlError) {
                                        console.log(JSON.stringify(SqlError));
                                    });
                            });
                    }
                }
            }
        };
        return G3ME ;
    })
    .factory('Smartgeo', function(SQLite){

        var Smartgeo = {

            // CONSTANTS
            _MAP_MAX_ZOOM : 20,
            _MAP_MIN_ZOOM : 13,

            _INSTALL_MAX_ASSETS_PER_HTTP_REQUEST     : 1000,
            _INSTALL_MAX_ASSETS_PER_ZONE             : 2048,
            _INSTALL_MAX_ASSETS_PER_INSERT_REQUEST   : 60,
            _INSTALL_MAX_ZONES_MATRIX_LENGTH         : 4,


            // METHODS
            setGimapUrl : function(){
                var url = prompt('URL GiMAP', localStorage.url||'');
                if(!url || url === 'null') {
                    return this.setGimapUrl();
                }
                if( url.indexOf('http') === -1 ) {
                    url = 'http://'+url;
                }
                if( url.indexOf('index.php?service=') === -1 ) {
                    url = url + '/index.php?service=';
                }
                return this.set('url', url);
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

            // GETTER AND SETTED
            get: function(parameter){
                return this[parameter] || localStorage[parameter];
            },
            set: function(parameter, value){
                localStorage[parameter] = value ;
                return localStorage[parameter];
            }
        };

        // Initialization
        if(!Smartgeo.get('url')){
            Smartgeo.setGimapUrl();
        }
        return Smartgeo ;

    }).factory('SQLite', function(){
        var SQLite = {

            // CONSTANTS
            DATABASE_SIZE    : 1024*1024*50,
            DATABASE_VERSION : '0.0.1-angular',

            // METHODS
            openDatabase : function(args){
                // TODO : MAKE IT POLYFILL (with cordova)
                return window.openDatabase(args.name, this.DATABASE_VERSION , args.name, this.DATABASE_SIZE);
            }

        };

        return SQLite ;
    });
