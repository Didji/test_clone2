angular.module('smartgeomobile').factory('G3ME', function (SQLite, Smartgeo, $rootScope, i18n) {

    'use strict';

    var G3ME = {

        _MAX_ZOOM: 22,
        _MIN_ZOOM: 0,

        active_layers: false,
        assetsMarkers: [],

        mapDiv: null,
        mapDivId: null,
        databases: {},

        benchMe: false,
        benchmarks: {},
        benchmarkResults: [],
        benchmarkGlobalResultPerSQL: 0,
        benchmarkGlobalResultPerTile: 0,
        benchmarkElapsedBenchmarks: 0,
        benchmarksLimit: 10,
        benchmarkGeneralStatistics: [],

        filecacheIsEnable:  (window.smartgeoRightsManager && window.smartgeoRightsManager.tileCache) || false,

        initialize: function (mapDivId, site, target, marker, zoom) {
            this.site = site;
            this.tileUrl = this.site.EXTERNAL_TILEURL;
            this.mapDiv = document.getElementById(mapDivId);
            this.map = new L.map(this.mapDiv, {
                attributionControl: false,
                zoomControl: false,
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM
            }).addControl(L.control.zoom({
                position: 'topright'
            }));

            L.control.scale({
                'imperial': false
            }).addTo(this.map);

            if ( !(target && target.length && G3ME.isLatLngString(target)) || G3ME.benchMe) {
                target = [
                    [this.site.extent.ymin, this.site.extent.xmin],
                    [this.site.extent.ymax, this.site.extent.xmax]
                ];
            }

            if (target[0] instanceof Array || G3ME.benchMe) {
                // target is an extend
                G3ME.map.fitBounds(target);
            } else if( target instanceof Array ){
                // target is a point
                G3ME.map.setView(target, zoom || 18);
                if (marker) {
                    if (marker._map) {
                        (marker._map.removeLayer)(marker);
                    }
                    marker.addTo(G3ME.map);
                }
            } else if (Smartgeo.get('lastLeafletMapExtent')) {
                G3ME.map.fitBounds(Smartgeo.get('lastLeafletMapExtent'));
            } else {
                G3ME.map.fitBounds(target);
            }

            G3ME.invalidateMapSize();

            if (!this.tileUrl) {
                this.tileUrl = Smartgeo.get('url').replace(/index.php.+$/, '');
                this.tileUrl += 'getTuileTMS.php?z={z}&x={x}&y={y}';
            }
            // this.tileUrl='http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png';
            // this.tileUrl='http://{s}.tile.cloudmade.com/4f5c5233516d4c39a218425764d98def/999/256/{z}/{x}/{y}.png';
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
                minZoom: G3ME._MIN_ZOOM
            }).addTo(this.map);

            this.tempAssetTile = new L.TileLayer.Canvas({
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM
            }).addTo(this.map);

            this.canvasTile.drawTile = function (canvas, tilePoint) {
                G3ME.drawTile(canvas, tilePoint, G3ME.benchMe);
            };
            this.tempAssetTile.drawTile = function (canvas, tilePoint) {
                G3ME.drawTempAssetTile(canvas, tilePoint, G3ME.benchMe);
            };

            for (var symbol in this.site.symbology) {
                if (!this.site.symbology[symbol] || !this.site.symbology[symbol].style) {
                    continue;
                }
                var image = new Image();
                image.src = this.site.symbology[symbol].style.symbol.icon;
                this.site.symbology[symbol].style.image = image;
            }
            this.canvasTile.redraw();
            this.tempAssetTile.redraw();

            window.test = this.BackgroundTile;

            $(window).on('resize', function () {
                G3ME.tilesOnScreen = ~~ ((window.innerHeight / 256) * (window.innerWidth / 256)) + 1;
            });

            G3ME.tilesOnScreen = ~~ ((window.innerHeight / 256) * (window.innerWidth / 256)) + 1;

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
                // it's a position ! returning [lat, lng]
                callback(target.split(','));
            } else if(''+(target*1) === target) {
                // so maybe it's an asset id ?
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
            if((typeof str === "object") && (typeof (1*str[0]) === "number") && (typeof (1*str[1]) === "number")){
                return true ;
            } else if(typeof str === "object"){
                return false;
            } else if(typeof str !== "string"){
                return false ;
            } else {
                return ((str ||  "").match(/^-?\d+[.]\d*,-?\d+[.]\d*$/) !== null);
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

        extents_match: function (extent1, extent2) {
            return !(extent1.xmax < extent2.xmin ||
                extent1.xmin > extent2.xmax ||
                extent1.ymin > extent2.ymax ||
                extent1.ymax < extent2.ymin);
        },

        fullscreen: function () {
            G3ME.mapDiv.style.width = "100%";
            G3ME.invalidateMapSize();
        },

        reduceMapWidth: function (px) {
            G3ME.mapDiv.style.width = (window.innerWidth - px) + 'px';
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
            this.tempAssetTile.redraw();
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

        benchStart: function (id) {
            G3ME.benchmarks[id] = (new Date()).getTime();
        },

        benchStop: function (id) {
            var end = (new Date()).getTime(),
                result = end - G3ME.benchmarks[id];

            G3ME.benchmarkResults.push(result);

            var oldLength = G3ME.benchmarkResults.length;

            setTimeout(function () {
                if (oldLength === G3ME.benchmarkResults.length) {
                    G3ME.benchProcessResults();
                }
            }, 500);
        },

        benchProcessResults: function () {
            var sum = 0;

            for (var i = 0; i < G3ME.benchmarkResults.length; i++) {
                sum += G3ME.benchmarkResults[i];
            }

            G3ME.benchmarkGeneralStatistics.push({
                tile: sum / G3ME.tilesOnScreen,
                request: sum / G3ME.benchmarkResults.length
            });
            G3ME.benchmarkGlobalResultPerSQL += sum / G3ME.tilesOnScreen;
            G3ME.benchmarkGlobalResultPerTile += sum / G3ME.benchmarkResults.length;
            G3ME.benchmarkResults = [];
            G3ME.benchmarks = {};
            G3ME.benchmarkElapsedBenchmarks++;

            if (G3ME.benchmarkElapsedBenchmarks < G3ME.benchmarksLimit) {
                this.canvasTile.redraw();
            } else {
                G3ME.benchmarkGeneralStatistics.benchmarkGlobalResultPerSQL = G3ME.benchmarkGlobalResultPerSQL / G3ME.benchmarksLimit;
                G3ME.benchmarkGeneralStatistics.benchmarkGlobalResultPerTile = G3ME.benchmarkGlobalResultPerTile / G3ME.benchmarksLimit;
                console.log(G3ME.benchmarkGeneralStatistics);
                G3ME.benchmarkElapsedBenchmarks = 0;
            }
        },



        drawTempAssetTile: function (canvas, tilePoint, performBench) {
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
                parse = window.JSON.parse,
                symbology = this.site.symbology,
                imageFactor = 1,
                // imageFactor = Math.floor(30 / (22 - zoom)) / 10,
                imageFactor_2 = 0.5,
                scale = 256 * Math.pow(2, zoom),
                xscale = canvas.width / Math.abs(xmax - xmin),
                yscale = canvas.height / Math.abs(ymax - ymin),
                initialTopLeftPointX = this.map._initialTopLeftPoint.x,
                initialTopLeftPointY = this.map._initialTopLeftPoint.y,
                delta_x = initialTopLeftPointX - nwmerc.x,
                delta_y = initialTopLeftPointY - nwmerc.y,
                DEG_TO_RAD = Math.PI / 180,
                buffer = 100 / xscale,
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

            // var zones = [],
            //     initargs = [xmin - buffer, xmax + buffer, ymin - buffer, ymax + buffer, zoom, zoom],
            //     finalargs = [],
            //     subrequests = [],
            //     tileExtent = {
            //         ymin: ymin,
            //         ymax: ymax,
            //         xmin: xmin,
            //         xmax: xmax
            //     };

            // var request = " SELECT * FROM ASSETS ";
            // request += " WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) ";
            // request += "    AND ( ( minzoom <= 1*? OR minzoom = 'null' ) AND ( maxzoom >= 1*? OR maxzoom = 'null' ) ) ";


            // if (this.active_layers) {
            //     request += this.active_layers.length ? ' and (symbolId like "' + this.active_layers.join('%" or symbolId like "') + '%" )' : ' and 1=2 ';
            // }

            // for (var i = 0; i < this.site.zones.length; i++) {
            //     if (this.extents_match(this.site.zones[i].extent, tileExtent)) {
            //         if (performBench) {
            //             G3ME.benchStart(this.site.zones[i].database_name);
            //         }
            //         (function (zone) {
            //             if (!G3ME.databases[zone.database_name]) {
            //                 G3ME.databases[zone.database_name] = SQLite.openDatabase({
            //                     name: zone.database_name,
            //                     bgType: 1
            //                 });
            //             }
            //             G3ME.databases[zone.database_name].transaction(function (tx) {
            //                 tx.executeSql(request, initargs,
            //                     function (tx, results) {
            // var rows = results.rows;

            function formatAsset(asset) {
                return asset ;
            }

            function convertToLinearArray(complexAsset, response) {
                response = response || [];
                if(complexAsset.geometry && !complexAsset.synced){
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
            Smartgeo.get_('census', function(census){

                if(!census || (census && !census.length)) {
                    return ;
                }

                var assets = [] ;

                for (var k = 0; k < census.length; k++) {
                    convertToLinearArray(census[k], assets);
                }

                if(!assets.length){
                    return;
                }

                for (var i = 0, length = assets.length; i < length; i++) {
                    var prevX = false,
                        prevY = false,
                        asset = assets[i],
                        assetSymbology = symbology[asset.okey+"0"],
                        coord, coord_ = {}, x, y, image;

                    if(G3ME.active_layers && G3ME.active_layers.indexOf(asset.okey) < 0){
                        continue ;
                    }
                    if( ! ((assetSymbology.minzoom <= zoom || assetSymbology.minzoom === null )
                        && ( assetSymbology.maxzoom >= zoom || assetSymbology.maxzoom  === null ))){
                        continue ;
                    }

                    asset.angle    = 0 ;
                    asset.maplabel = '('+asset.fields[window.site.metamodel[asset.okey].ukey]+')';

                    var geom = {};
                    if(asset.geometry.length === 2 && asset.geometry[0]*1 === asset.geometry[0]){
                        geom.type = "Point" ;
                        geom.coordinates = swap(asset.geometry);
                    } else {
                        geom.coordinates = [];
                        geom.type = "LineString" ;
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
                                _middle = {}, _segmentBegin = {};

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

                        image = assetSymbology.style.image;

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
            });
        },

        drawTile: function (canvas, tilePoint, performBench) {
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
                parse = window.JSON.parse,
                symbology = this.site.symbology,
                imageFactor = 1,
                // imageFactor = Math.floor(30 / (22 - zoom)) / 10,
                imageFactor_2 = 0.5,
                scale = 256 * Math.pow(2, zoom),
                xscale = canvas.width / Math.abs(xmax - xmin),
                yscale = canvas.height / Math.abs(ymax - ymin),
                initialTopLeftPointX = this.map._initialTopLeftPoint.x,
                initialTopLeftPointY = this.map._initialTopLeftPoint.y,
                delta_x = initialTopLeftPointX - nwmerc.x,
                delta_y = initialTopLeftPointY - nwmerc.y,
                DEG_TO_RAD = Math.PI / 180,
                buffer = 100 / xscale,
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

            var request = " SELECT * FROM ASSETS ";
            request += " WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) ";
            request += "    AND ( ( minzoom <= 1*? OR minzoom = 'null' ) AND ( maxzoom >= 1*? OR maxzoom = 'null' ) ) ";


            if (this.active_layers) {
                request += this.active_layers.length ? ' and (symbolId like "' + this.active_layers.join('%" or symbolId like "') + '%" )' : ' and 1=2 ';
            }

            for (var i = 0; i < this.site.zones.length; i++) {
                if (this.extents_match(this.site.zones[i].extent, tileExtent)) {
                    if (performBench) {
                        G3ME.benchStart(this.site.zones[i].database_name);
                    }
                    (function (zone) {
                        if (!G3ME.databases[zone.database_name]) {
                            G3ME.databases[zone.database_name] = SQLite.openDatabase({
                                name: zone.database_name,
                                bgType: 1
                            });
                        }
                        G3ME.databases[zone.database_name].transaction(function (tx) {
                            tx.executeSql(request, initargs,
                                function (tx, results) {
                                    var rows = results.rows;
                                    for (var i = 0, length = rows.length; i < length; i++) {
                                        var prevX = false,
                                            prevY = false,
                                            asset = rows.item(i),
                                            geom = parse(asset.geometry),
                                            assetSymbology = symbology[asset.symbolId],
                                            coord, coord_ = {}, x, y, image;
                                        if (geom.type === "MultiLineString" || geom.type === "Polygon") {
                                            geom.coordinates = geom.coordinates[0];
                                            ctx.strokeStyle = assetSymbology.style.strokecolor;
                                            ctx.fillStyle = assetSymbology.style.fillcolor;
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
                                                    _middle = {}, _segmentBegin = {};

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

                                            image = symbology[asset.symbolId.toString()].style.image;

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
                                                ctx.fillStyle = symbology[asset.symbolId].style.fillcolor;
                                                ctx.fill();
                                                ctx.fillText(asset.maplabel, coord_.x + 1, coord_.y + 1);
                                            }
                                        } else {
                                            console.log(geom);
                                            console.log(asset);

                                            Smartgeo.log(i18n.get("_G3ME_UNKNOWN_GEOMETRY", geom.type));
                                        }
                                        if (geom.type === "Polygon") {
                                            ctx.fill();
                                        }
                                    }
                                    if (zoom > 16) {
                                        drawLabels(ctx);
                                    }

                                    if (performBench) {
                                        G3ME.benchStop(zone.database_name);
                                    }
                                }, function (tx, SqlError) {
                                    Smartgeo.log(SqlError);
                                });
                        });
                    })(this.site.zones[i])
                }
            }
        }

    };
    return G3ME;
});
