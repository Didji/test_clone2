angular.module('smartgeomobile').factory('G3ME', function (SQLite, Smartgeo, $rootScope, i18n, Storage, Site) {

    'use strict';

    var G3ME = {

        _MAX_ZOOM: 21,
        _MIN_ZOOM: 0,

        active_layers: false,
        assetsMarkers: [],

        mapDiv: null,
        mapDivId: null,
        databases: {},

        requestPool: {},

        filecacheIsEnable: true,

        initialize: function (extent) {

            this.symbology = Site.current.symbology;
            this.CURRENT_ZOOM = false;
            this.tileUrl = Site.current.EXTERNAL_TILEURL;
            this.crs = L.CRS.EPSG4326;
            this.margin = 0.00005;
            this._2pi = 2 * Math.PI;
            this._pi4 = Math.PI / 4;
            this.DEG_TO_RAD = Math.PI / 180;
            this.minDistanceToALabel = 15;
            this.mapDivId = 'smartgeo-map';
            this.map = new L.map(document.getElementById(this.mapDivId), {
                attributionControl: false,
                zoomControl: false,
                zoomAnimation: true,
                inertia: navigator.userAgent.match(/Android/i) ? false : true,
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM,
                attribution: ''
            }).addControl(L.control.zoom({
                position: 'topright'
            }));

            L.control.scale({
                'imperial': false
            }).addTo(this.map);

            G3ME.map.fitBounds(Storage.get('lastLeafletMapExtent') || extent);

            this.tileUrl = 'http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
            if (!this.tileUrl) {
                this.tileUrl = Storage.get('url').replace(/index.php.+$/, '');
                this.tileUrl += 'getTuileTMS.php?z={z}&x={x}&y={y}';
            }
            var BackgroundTile;

            if (this.filecacheIsEnable) {
                BackgroundTile = L.TileLayer.FileCache;
            } else {
                BackgroundTile = L.TileLayer;
            }
            this.BackgroundTile = new BackgroundTile(this.tileUrl, {
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM
            }).addTo(this.map);

            this.canvasTile = new L.TileLayer.Canvas({
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM,
                async: true,
                updateWhenIdle: true
            });

            this.tempAssetTile = new L.TileLayer.Canvas({
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM
            });

            this.tempAssetTile.isTemp = true;

            this.canvasTile.drawTile = function (canvas, tilePoint) {
                G3ME.drawTile(canvas, tilePoint);
            };

            this.tempAssetTile.drawTile = function (canvas, tilePoint) {
                G3ME.drawTempAssetTile(canvas, tilePoint, G3ME.benchMe);
            };

            window.SMARTGEO_CURRENT_SITE_IMG = window.SMARTGEO_CURRENT_SITE_IMG || {};

            for (var symbol in Site.current.symbology) {
                if (!Site.current.symbology[symbol] || !Site.current.symbology[symbol].style) {
                    continue;
                }
                var image = new Image();
                image.src = Site.current.symbology[symbol].style.symbol.icon;
                window.SMARTGEO_CURRENT_SITE_IMG[symbol] = image;
            }

            this.canvasTile.addTo(this.map);
            this.tempAssetTile.addTo(this.map);

            return this.map;
        },

        zoomOnAsset: function (asset) {
            G3ME.map.setView(G3ME.getLineStringMiddle(asset.geometry.coordinates), 18);
            G3ME.invalidateMapSize();
        },

        getLineStringMiddle: function (lineString) {
            var lineStringLength = 0;
            var coords = lineString.coordinates;
            for (var i = 0; i < coords.length - 1; i++) {
                var p1 = coords[i];
                var p2 = coords[i + 1];
                p1[2] = lineStringLength;
                lineStringLength += Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
            }
            coords[coords.length - 1][2] = lineStringLength;
            var lineStringMiddle = lineStringLength / 2;
            for (i = 0; i < coords.length - 1; i++) {
                var p1b = coords[i];
                var p2b = coords[i + 1];
                if (p1b[2] <= lineStringMiddle && lineStringMiddle <= p2b[2]) {
                    var raptor = (lineStringMiddle - p1b[2]) / (p2b[2] - p1b[2]);
                    return [p1b[1] + raptor * (p2b[1] - p1b[1]), p1b[0] + raptor * (p2b[0] - p1b[0]), p1b];
                }
            }
        },

        parseTarget: function (site, target, callback, error) {
            if (G3ME.isLatLngString(target)) {
                callback(target.split(','));
            } else if ('' + (target * 1) === target) {
                Smartgeo.findAssetsByGuids(site, target, function (assets) {
                    if (!assets.length) {
                        callback([]);
                    } else {
                        var geometry;
                        try {
                            geometry = JSON.parse(assets[0].geometry);
                        } catch (e) {
                            geometry = assets[0].geometry;
                        }
                        if (geometry.type === 'Point') {
                            callback([assets[0].ymin, assets[0].xmin]);
                        } else {
                            callback(G3ME.getLineStringMiddle(geometry));
                        }
                    }
                }, null, null, function () {
                    (error || function () {})();
                });
            } else {
                (error || function () {})();
            }
        },

        isLatLngString: function (str) {
            if ((typeof str === "object") && (typeof (1 * str[0]) === "number") && (typeof (1 * str[1]) === "number")) {
                return true;
            } else if (typeof str === "object") {
                return false;
            } else if (typeof str !== "string") {
                return false;
            } else {
                return ((str || "").match(/^-?\d+[.]\d*,-?\d+[.]\d*$/) !== null);
            }
        },

        invalidateMapSize: function (timeout, callback) {
            timeout = timeout || 10;
            setTimeout(function () {
                G3ME.map.invalidateSize();
                (callback || function () {})();
            }, 10);
        },

        getExtentsFromAssetsList: function (assets) {
            var xmin = Infinity,
                xmax = -Infinity,
                ymin = Infinity,
                ymax = -Infinity;
            for (var i = 0; i < assets.length; i++) {
                xmin = assets[i].xmin < xmin ? assets[i].xmin : xmin;
                ymin = assets[i].ymin < ymin ? assets[i].ymin : ymin;
                xmax = assets[i].xmax > xmax ? assets[i].xmax : xmax;
                ymax = assets[i].ymax > ymax ? assets[i].ymax : ymax;
            }
            return {
                xmin: xmin,
                xmax: xmax,
                ymin: ymin,
                ymax: ymax
            };
        },

        extents_match: function (container, contained) {
            return !(container.xmax < contained.xmin ||
                container.xmin > contained.xmax ||
                container.ymin > contained.ymax ||
                container.ymax < contained.ymin);
        },

        fullscreen: function () {
            document.getElementById(G3ME.mapDivId).style.width = "100%";
            G3ME.invalidateMapSize();
        },

        reduceMapWidth: function (px) {
            document.getElementById(G3ME.mapDivId).style.width = (window.innerWidth - px) + 'px';
            G3ME.invalidateMapSize();
        },

        setVisibility: function (layers) {
            this.active_layers = [];
            for (var i in layers) {
                if (layers[i].status) {
                    this.active_layers.push(i);
                }
            }
            this.canvasTile.redraw();
        },
        getVisibility: function () {
            if (this.active_layers === false) {
                return false;
            }
            var rv = {};
            for (var i in this.active_layers) {
                rv[this.active_layers[i]] = true;
            }
            return rv;
        },

        drawTempAssetTile: function (canvas, tilePoint) {

            var census = Storage.get_('census');

            if (!census || (census && !census.length)) {
                return;
            }

            var ctx = canvas.getContext('2d');
            var zoom = this.map.getZoom(),
                crs = L.CRS.EPSG4326,
                nwPoint = tilePoint.multiplyBy(256),
                sePoint = nwPoint.add(new L.Point(256, 256)),
                nw = crs.project(this.map.unproject(nwPoint, zoom)),
                se = crs.project(this.map.unproject(sePoint, zoom)),
                nwmerc = this.map.latLngToLayerPoint({
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
                symbology = Site.current.symbology,
                imageFactor = 1,
                imageFactor_2 = 0.5,
                scale = 256 * Math.pow(2, zoom),
                xscale = canvas.width / Math.abs(xmax - xmin),
                yscale = canvas.height / Math.abs(ymax - ymin),
                initialTopLeftPointX = this.map._initialTopLeftPoint.x,
                initialTopLeftPointY = this.map._initialTopLeftPoint.y,
                DEG_TO_RAD = Math.PI / 180,
                drawnLabels = [],
                labelCache = [],
                minDistanceToALabel = 15;


            function drawLabel(ctx, txt, size, x, y, angle, color) {

                ctx.save();

                // Anticollision primaire.
                var cur;
                ctx.fillStyle = color;
                for (var i = 0, lim = drawnLabels.length; i < lim; i++) {
                    cur = drawnLabels[i];
                    if ((x < (cur.x + cur.width + minDistanceToALabel)) &&
                        (x > (cur.x - minDistanceToALabel)) &&
                        (y < (cur.y + cur.width + minDistanceToALabel)) &&
                        (y > (cur.y - minDistanceToALabel))) {
                        return;
                    }
                }
                var _width = ctx.measureText(txt).width;


                ctx.translate(x, y);
                var offset_x = size * imageFactor_2 + 1;
                var offset_y = 0;
                if (angle) {
                    ctx.rotate(angle * DEG_TO_RAD);
                    offset_x = -_width / 2;
                    offset_y = -4;
                }

                drawnLabels.push({
                    x: x + offset_x,
                    y: y + offset_y,
                    width: _width
                });

                ctx.font = (size / 2) + 'px Arial';
                ctx.strokeText(txt, offset_x, offset_y);
                ctx.fillText(txt, offset_x, offset_y);
                ctx.restore();
            }

            function drawLabels(ctx) {
                var cur;
                var lineWidth = ctx.lineWidth;
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'white';
                for (var i = 0, lim = labelCache.length; i < lim; i++) {
                    cur = labelCache[i];
                    drawLabel(ctx, cur.txt, cur.size, cur.x, cur.y, cur.angle, cur.color);
                }
                ctx.lineWidth = lineWidth;
            }

            function addLabel(txt, size, x, y, angle, color) {
                labelCache.push({
                    txt: txt,
                    x: x,
                    y: y,
                    size: size,
                    color: color,
                    angle: angle
                });
            }

            function convertToLinearArray(complexAsset, response) {
                response = response || [];
                if (complexAsset.synced) {
                    return;
                }
                if (complexAsset.geometry && !complexAsset.synced) {
                    response.push(complexAsset);
                }
                for (var i = 0; i < complexAsset.children.length; i++) {
                    convertToLinearArray(complexAsset.children[i], response);
                }
            }

            function swap(ar) {
                var b = ar[0];
                ar[0] = ar[1];
                ar[1] = b;
                return ar;
            }

            if (!census || (census && !census.length)) {
                return;
            }

            var assets = [];

            for (var k = 0; k < census.length; k++) {
                convertToLinearArray(census[k], assets);
            }

            if (!assets.length) {
                return;
            }

            for (var i = 0, length = assets.length; i < length; i++) {
                var prevX = false,
                    prevY = false,
                    asset = assets[i],
                    assetSymbology = symbology[asset.okey + "0"],
                    coord, coord_ = {},
                    image;

                if (G3ME.active_layers && G3ME.active_layers.indexOf(asset.okey) < 0) {
                    continue;
                }
                if (!((assetSymbology.minzoom <= zoom || assetSymbology.minzoom === null) && (assetSymbology.maxzoom >= zoom || assetSymbology.maxzoom === null))) {
                    continue;
                }

                asset.angle = 0;
                asset.maplabel = '(' + asset.fields[Site.current.metamodel[asset.okey].ukey] + ')';

                var geom = {};
                if (asset.geometry.length === 2 && asset.geometry[0] * 1 === asset.geometry[0]) {
                    geom.type = "Point";
                    geom.coordinates = swap(asset.geometry);
                } else {
                    geom.coordinates = [];
                    geom.type = "LineString";
                    for (var z = 0; z < asset.geometry.length; z++) {
                        geom.coordinates.push(swap(asset.geometry[z]));
                    }
                }
                if (geom.type === "LineString" || geom.type === "MultiLineString" || geom.type === "Polygon") {
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
                    if ((geom.type === "LineString" || geom.type === "MultiLineString") && zoom > 16 && asset.maplabel) {
                        var middle = G3ME.getLineStringMiddle(geom),
                            _middle = {},
                            _segmentBegin = {};

                        _middle.x = middle[1] * 0.017453292519943295;
                        _middle.y = Math.log(Math.tan(_pi4 + (middle[0] * 0.008726646259971648)));

                        _middle.x = scale * (0.15915494309189535 * _middle.x + 0.5);
                        _middle.y = scale * (-0.15915494309189535 * _middle.y + 0.5);

                        _middle.x = Math.floor(0.5 + _middle.x) - initialTopLeftPointX - nwmerc.x;
                        _middle.y = Math.floor(0.5 + _middle.y) - initialTopLeftPointY - nwmerc.y;

                        _segmentBegin.x = middle[2][0] * 0.017453292519943295;
                        _segmentBegin.y = Math.log(Math.tan(_pi4 + (middle[2][1] * 0.008726646259971648)));

                        _segmentBegin.x = scale * (0.15915494309189535 * _segmentBegin.x + 0.5);
                        _segmentBegin.y = scale * (-0.15915494309189535 * _segmentBegin.y + 0.5);

                        _segmentBegin.x = Math.floor(0.5 + _segmentBegin.x) - initialTopLeftPointX - nwmerc.x;
                        _segmentBegin.y = Math.floor(0.5 + _segmentBegin.y) - initialTopLeftPointY - nwmerc.y;


                        var dx = _middle.x - _segmentBegin.x,
                            dy = _middle.y - _segmentBegin.y;
                        if (dy < 0) {
                            dx = -dx;
                        }
                        _middle.angle = Math.acos(dx / Math.sqrt(dx * dx + dy * dy)) * (180 / Math.PI);

                        if (_middle.angle > 90) {
                            _middle.angle -= 180;
                        }

                        addLabel(asset.maplabel, assetSymbology.label.size * 2, _middle.x, _middle.y, _middle.angle, assetSymbology.label.color);
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

                    image = window.SMARTGEO_CURRENT_SITE_IMG[asset.okey + "0"];

                    if (image) {
                        ctx.save();
                        ctx.translate(coord_.x, coord_.y);
                        ctx.rotate(-asset.angle * DEG_TO_RAD);
                        ctx.drawImage(image, -image.width * imageFactor_2, -image.height * imageFactor_2,
                            image.width * imageFactor,
                            image.height * imageFactor);
                        ctx.restore();
                        if (zoom > 16 && asset.maplabel) {
                            addLabel(asset.maplabel, image.width, coord_.x, coord_.y, null, assetSymbology.label.color);
                        }
                    } else {
                        ctx.beginPath();
                        ctx.arc(coord_.x, coord_.y, dotSize, 0, _2pi, true);
                        ctx.fillStyle = assetSymbology.style.fillcolor;
                        ctx.fill();
                        ctx.fillText(asset.maplabel, coord_.x + 1, coord_.y + 1);
                    }
                }
            }
            if (zoom > 16) {
                drawLabels(ctx);
            }
        },

        baseRequest: " SELECT '##UUID##' as tileUuid, geometry, symbolId, maplabel, angle FROM ASSETS  WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) AND ( ( minzoom <= 1*? OR minzoom = 'null' ) AND ( maxzoom >= 1*? OR maxzoom = 'null' ) ) ",

        drawTile: function (canvas, tilePoint) {
            var ctx = canvas.getContext('2d'),
                zoom = this.map.getZoom(),
                nwPoint = tilePoint.multiplyBy(256),
                sePoint = nwPoint.add(new L.Point(256, 256)),
                nw = this.crs.project(this.map.unproject(nwPoint, zoom)),
                se = this.crs.project(this.map.unproject(sePoint, zoom)),
                nwmerc = this.map.latLngToLayerPoint({
                    lat: nw.y,
                    lng: nw.x
                }),
                margin = 0.00005,
                ymin = se.y - margin,
                ymax = nw.y + margin,
                xmin = nw.x - margin,
                xmax = se.x + margin,
                dotSize = Math.floor(0.5 + (7 / (19 - zoom))),
                scale = 256 * Math.pow(2, zoom),
                xscale = 256 / Math.abs(xmax - xmin),
                yscale = 256 / Math.abs(ymax - ymin),
                buffer = 100 / xscale,
                initialTopLeftPointX = this.map._initialTopLeftPoint.x,
                initialTopLeftPointY = this.map._initialTopLeftPoint.y;

            var initargs = [xmin - buffer, xmax + buffer, ymin - buffer, ymax + buffer, zoom, zoom],
                tileExtent = {
                    ymin: ymin,
                    ymax: ymax,
                    xmin: xmin,
                    xmax: xmax
                },
                uuid = Smartgeo.uuid(),
                request = G3ME.baseRequest.replace("##UUID##", uuid);

            if (this.active_layers) {
                request += this.active_layers.length ? ' and (symbolId like "' + this.active_layers.join('%" or symbolId like "') + '%" )' : ' and 1=2 ';
            }

            if (G3ME.map.getZoom() !== zoom) {
                return G3ME.canvasTile.tileDrawn(canvas);
            }
            for (var i = 0, zones_length = Site.current.zones.length, j = 0; i < zones_length; i++) {
                if (this.extents_match(Site.current.zones[i].extent, tileExtent)) {
                    j++;
                    G3ME.requestPool[Site.current.zones[i].database_name] = G3ME.requestPool[Site.current.zones[i].database_name] || {};
                    G3ME.requestPool[Site.current.zones[i].database_name][uuid] = {
                        request: request,
                        initargs: initargs,
                        callback: (function (uuid, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize, canvas) {
                            return function (results) {
                                drawCanvasForZone(uuid, results, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize, canvas);
                            };
                        })(uuid, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize, canvas)
                    };
                }
            }
            G3ME.poolRequestInvokator();
            if (j === 0) {
                G3ME.canvasTile.tileDrawn(canvas);
            }
        },

        poolRequestInvokator: function () {
            clearTimeout(G3ME.poolRequestExecutorTimeout);
            G3ME.poolRequestExecutorTimeout = setTimeout(function () {
                G3ME.poolRequestExecutor(angular.copy(G3ME.requestPool));
                G3ME.requestPool = {};
            }, 20);
        },

        poolRequestExecutor: function (pool) {
            for (var databaseName in pool) {
                var request = [];
                var args = [];
                for (var uuid in pool[databaseName]) {
                    request.push(pool[databaseName][uuid].request);
                    args = args.concat(pool[databaseName][uuid].initargs);
                }
                request = request.join(' UNION ALL ') + ' ORDER BY tileUuid, symbolId ';
                G3ME.prevAnonFunction(pool[databaseName], databaseName, request, args);
            }
        },

        prevAnonFunction: function (currentRequestPool, currentDb, req, args) {
            SQLite.openDatabase({
                name: currentDb,
                bgType: 1
            }).transaction(function (tx) {
                tx.executeSql(req, args,
                    function (tx, results) {
                        for (var uuid in currentRequestPool) {
                            currentRequestPool[uuid].callback(results);
                        }
                    },
                    function () {
                        console.error(arguments);
                    });
            });
        }

    };



    function drawCanvasForZone(uuid, results, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize, canvas) {

        var rows = results.rows,
            previousSymbolId = null,
            changeContext = false,
            image, assetSymbology, uuidHasBeenSeen, currentMapBounds = G3ME.map.getBounds(),
            labelCache = [],
            drawnLabels = [];

        if (!G3ME.extents_match({
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax
        }, {
            xmin: currentMapBounds._southWest.lng,
            xmax: currentMapBounds._northEast.lng,
            ymin: currentMapBounds._southWest.lat,
            ymax: currentMapBounds._northEast.lat
        }) || G3ME.map.getZoom() !== zoom) {
            return G3ME.canvasTile.tileDrawn(canvas);
        }
        for (var i = 0, length = rows.length; i < length; i++) {

            var asset = rows.item(i);

            if (asset.tileUuid !== uuid && !uuidHasBeenSeen) {
                continue;
            } else if (asset.tileUuid === uuid && !uuidHasBeenSeen) {
                uuidHasBeenSeen = true;
            } else if (asset.tileUuid !== uuid && uuidHasBeenSeen) {
                if (zoom > 16) {
                    drawLabels(ctx, labelCache, drawnLabels);
                }
                return G3ME.canvasTile.tileDrawn(canvas);
            }

            var previousX = false,
                previousY = false,
                coord, coord_ = {},
                geometry = JSON.parse(asset.geometry);

            changeContext = (previousSymbolId !== asset.symbolId);

            if (changeContext) {
                assetSymbology = G3ME.symbology[asset.symbolId];
                ctx.strokeStyle = assetSymbology.style.strokecolor;
                ctx.fillStyle = assetSymbology.style.fillcolor;
                image = window.SMARTGEO_CURRENT_SITE_IMG[asset.symbolId.toString()];
            }

            previousSymbolId = asset.symbolId;

            if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
                geometry.coordinates = geometry.coordinates[0];
            }
            if (geometry.type === "LineString" || geometry.type === "MultiLineString" || geometry.type === "Polygon") {
                ctx.beginPath();
                for (var j = 0, l = geometry.coordinates.length; j < l; j++) {
                    coord = geometry.coordinates[j];
                    if (zoom < 15) {
                        coord_.x = Math.floor(0.5 + ((coord[0] - xmin) * xscale));
                        coord_.y = Math.floor(0.5 + ((ymax - coord[1]) * yscale));
                    } else {
                        coord_.x = coord[0] * 0.017453292519943295;
                        coord_.y = Math.log(Math.tan(G3ME._pi4 + (coord[1] * 0.008726646259971648)));

                        coord_.x = scale * (0.15915494309189535 * coord_.x + 0.5);
                        coord_.y = scale * (-0.15915494309189535 * coord_.y + 0.5);

                        coord_.x = Math.floor(0.5 + coord_.x) - initialTopLeftPointX - nwmerc.x;
                        coord_.y = Math.floor(0.5 + coord_.y) - initialTopLeftPointY - nwmerc.y;
                    }

                    if (previousX === false) {
                        ctx.moveTo(coord_.x, coord_.y);
                    } else if (coord_.x === previousX && coord_.y === previousY) {
                        continue;
                    } else {
                        ctx.lineTo(coord_.x, coord_.y);
                    }

                    previousX = coord_.x;
                    previousY = coord_.y;
                }
                if ((geometry.type === "LineString" || geometry.type === "MultiLineString") && zoom > 16 && asset.maplabel) {
                    var middle = G3ME.getLineStringMiddle(geometry),
                        _middle = {},
                        _segmentBegin = {};

                    _middle.x = middle[1] * 0.017453292519943295;
                    _middle.y = Math.log(Math.tan(G3ME._pi4 + (middle[0] * 0.008726646259971648)));

                    _middle.x = scale * (0.15915494309189535 * _middle.x + 0.5);
                    _middle.y = scale * (-0.15915494309189535 * _middle.y + 0.5);

                    _middle.x = Math.floor(0.5 + _middle.x) - initialTopLeftPointX - nwmerc.x;
                    _middle.y = Math.floor(0.5 + _middle.y) - initialTopLeftPointY - nwmerc.y;

                    _segmentBegin.x = middle[2][0] * 0.017453292519943295;
                    _segmentBegin.y = Math.log(Math.tan(G3ME._pi4 + (middle[2][1] * 0.008726646259971648)));

                    _segmentBegin.x = scale * (0.15915494309189535 * _segmentBegin.x + 0.5);
                    _segmentBegin.y = scale * (-0.15915494309189535 * _segmentBegin.y + 0.5);

                    _segmentBegin.x = Math.floor(0.5 + _segmentBegin.x) - initialTopLeftPointX - nwmerc.x;
                    _segmentBegin.y = Math.floor(0.5 + _segmentBegin.y) - initialTopLeftPointY - nwmerc.y;


                    var dx = _middle.x - _segmentBegin.x,
                        dy = _middle.y - _segmentBegin.y;
                    if (dy < 0) {
                        dx = -dx;
                    }
                    _middle.angle = Math.acos(dx / Math.sqrt(dx * dx + dy * dy)) * (180 / Math.PI);

                    if (_middle.angle > 90) {
                        _middle.angle -= 180;
                    }

                    labelCache.push({
                        txt: asset.maplabel.replace(/&#039;/g, "'").replace(/\\\\/g, "\\"),
                        x: _middle.x,
                        y: _middle.y,
                        size: assetSymbology.label.size * 3,
                        color: assetSymbology.label.color,
                        angle: _middle.angle
                    });
                }
                ctx.stroke();
                if (geometry.type === "Polygon") {
                    ctx.fill();
                }
            } else if (geometry.type === "Point" && image) {

                coord_.x = geometry.coordinates[0] * 0.017453292519943295;
                coord_.y = Math.log(Math.tan(G3ME._pi4 + (geometry.coordinates[1] * 0.008726646259971648)));

                coord_.x = scale * (0.15915494309189535 * coord_.x + 0.5);
                coord_.y = scale * (-0.15915494309189535 * coord_.y + 0.5);

                coord_.x = Math.floor(0.5 + coord_.x) - initialTopLeftPointX - nwmerc.x;
                coord_.y = Math.floor(0.5 + coord_.y) - initialTopLeftPointY - nwmerc.y;

                ctx.save();
                ctx.translate(coord_.x, coord_.y);
                ctx.rotate(-asset.angle * G3ME.DEG_TO_RAD);
                ctx.drawImage(image, -image.width * 0.5, -image.height * 0.5, image.width, image.height);
                ctx.restore();
                if (zoom > 16 && asset.maplabel) {
                    labelCache.push({
                        txt: asset.maplabel.replace(/&#039;/g, "'").replace(/\\\\/g, "\\"),
                        x: coord_.x,
                        y: coord_.y,
                        size: image.width,
                        color: assetSymbology.label.color,
                        angle: null
                    });
                }
            }

        }
        if (zoom > 16) {
            drawLabels(ctx, labelCache, drawnLabels);
        }
        G3ME.canvasTile.tileDrawn(canvas);

    }

    function drawLabel(ctx, txt, size, x, y, angle, color, drawnLabels_) {
        ctx.save();
        var cur;
        if (ctx.fillStyle !== color.toLowerCase()) {
            ctx.fillStyle = color;
        }
        for (var i = 0, lim = drawnLabels_.length; i < lim; i++) {
            cur = drawnLabels_[i];
            if ((x < (cur.x + cur.width + G3ME.minDistanceToALabel)) &&
                (x > (cur.x - G3ME.minDistanceToALabel)) &&
                (y < (cur.y + cur.width + G3ME.minDistanceToALabel)) &&
                (y > (cur.y - G3ME.minDistanceToALabel))) {
                return;
            }
        }
        var _width = ctx.measureText(txt).width;


        ctx.translate(x, y);
        var offset_x = size * 0.5 + 1;
        var offset_y = 0;
        if (angle) {
            ctx.rotate(angle * G3ME.DEG_TO_RAD);
            offset_x = -_width / 2;
            offset_y = -4;
        }

        drawnLabels_.push({
            x: x + offset_x,
            y: y + offset_y,
            width: _width
        });

        var newFont = (size / 2) + 'px Arial';
        if (ctx.font !== newFont) {
            ctx.font = newFont;
        }
        ctx.strokeText(txt, offset_x, offset_y);
        ctx.fillText(txt, offset_x, offset_y);
        ctx.restore();
    }

    function drawLabels(ctx, labelCache_, drawnLabels_) {
        var cur;
        var lineWidth = ctx.lineWidth;
        var strokeStyle = ctx.strokeStyle;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'white';
        for (var i = 0, lim = labelCache_.length; i < lim; i++) {
            cur = labelCache_[i];
            drawLabel(ctx, cur.txt, cur.size, cur.x, cur.y, cur.angle, cur.color, drawnLabels_);
        }
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
    }
    return G3ME;
});
