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

        requestPool : {},

        filecacheIsEnable: window.smartgeoRightsManager && window.smartgeoRightsManager.tileCache,

        initialize: function (mapDivId, site, target, marker, zoom) {
            this.site = site;
            this.symbology = this.site.symbology ;
            this.CURRENT_ZOOM = false;
            this.tileUrl = this.site.EXTERNAL_TILEURL;
            this.mapDiv = document.getElementById(mapDivId);
            this.crs = L.CRS.EPSG4326;
            this.margin = 0.00005;
            this._2pi = 2 * Math.PI;
            this._pi4 = Math.PI / 4;
            this.DEG_TO_RAD = Math.PI / 180;
            this.minDistanceToALabel = 15;
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

            if ( !(target && target.length && G3ME.isLatLngString(target))) {
                target = [
                    [this.site.extent.ymin, this.site.extent.xmin],
                    [this.site.extent.ymax, this.site.extent.xmax]
                ];
            }

            if (target[0] instanceof Array) {
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
            this.tileUrl= 'http://{s}.tile.cloudmade.com/4f5c5233516d4c39a218425764d98def/998/256/{z}/{x}/{y}.png';
            // this.tileUrl='http://{s}.tile.cloudmade.com/4f5c5233516d4c39a218425764d98def/999/256/{z}/{x}/{y}.png';
            var BackgroundTile;

            if (this.filecacheIsEnable && !navigator.userAgent.match(/Apple/i)) {
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
                async : true
            })

            this.canvasTile.drawTile = function (canvas, tilePoint) {
                G3ME.drawTile(canvas, tilePoint);
            };

            for (var symbol in this.site.symbology) {
                if (!this.site.symbology[symbol] || !this.site.symbology[symbol].style) {
                    continue;
                }
                var image = new Image();
                image.src = this.site.symbology[symbol].style.symbol.icon;
                this.site.symbology[symbol].style.image = image;
            }

            $(window).on('resize', function () {
                G3ME.tilesOnScreen = ~~ ((window.innerHeight / 256) * (window.innerWidth / 256)) + 1;
            });

            G3ME.tilesOnScreen = ~~ ((window.innerHeight / 256) * (window.innerWidth / 256)) + 1;

            this.canvasTile.on('loading', function(){
                console.time('Canvas Tile Layer Drawing');
            }).on('load', function(){
                console.timeEnd('Canvas Tile Layer Drawing');
            }).addTo(this.map);
            window.mapmap= this.map ;


            this.myWorker = new Worker("javascripts/workers/test.js");

            this.myWorker.onmessage = function (oEvent) {
                console.log("Called back by the worker!\n", oEvent);
            };


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
            } else if(''+(target*1) === target) {
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
            var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
            for (var i = 0; i < assets.length; i++) {
                xmin = assets[i].xmin < xmin ? assets[i].xmin : xmin;
                ymin = assets[i].ymin < ymin ? assets[i].ymin : ymin;
                xmax = assets[i].xmax > xmax ? assets[i].xmax : xmax;
                ymax = assets[i].ymax > ymax ? assets[i].ymax : ymax;
            }
            return { xmin: xmin,xmax: xmax,ymin: ymin,ymax: ymax };
        },

        extents_match: function (container, contained) {
            return !(container.xmax < contained.xmin ||
                container.xmin > contained.xmax ||
                container.ymin > contained.ymax ||
                container.ymax < contained.ymin);
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

        baseRequest : " SELECT '##UUID##' as tileUuid, geometry, symbolId, maplabel, angle FROM ASSETS  WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) AND ( ( minzoom <= 1*? OR minzoom = 'null' ) AND ( maxzoom >= 1*? OR maxzoom = 'null' ) ) ",

        drawTile: function (canvas, tilePoint) {
            var ctx = canvas.getContext('2d'),
                zoom = this.map.getZoom(),
                nwPoint = tilePoint.multiplyBy(256),
                sePoint = nwPoint.add(new L.Point(256, 256)),
                nw = this.crs.project(this.map.unproject(nwPoint, zoom)),
                se = this.crs.project(this.map.unproject(sePoint, zoom)),
                nwmerc = this.map.latLngToLayerPoint({lat: nw.y,lng: nw.x}),
                margin = 0.00001,
                ymin = se.y - margin,
                ymax = nw.y + margin,
                xmin = nw.x - margin,
                xmax = se.x + margin,
                dotSize = Math.floor(0.5 + (7 / (19 - zoom))),
                scale  = 256 * Math.pow(2, zoom),
                xscale = 256 / Math.abs(xmax - xmin),
                yscale = 256 / Math.abs(ymax - ymin),
                buffer = 100 / xscale,
                initialTopLeftPointX  = this.map._initialTopLeftPoint.x,
                initialTopLeftPointY = this.map._initialTopLeftPoint.y,
                delta_x = initialTopLeftPointX - nwmerc.x,
                delta_y = initialTopLeftPointY - nwmerc.y,
                drawnLabels = [],
                labelCache = [];

            var initargs = [xmin, xmax, ymin, ymax, zoom, zoom],
                tileExtent  = { ymin: ymin,ymax: ymax,xmin: xmin,xmax: xmax },
                uuid        = Smartgeo.uuid(),
                request     = G3ME.baseRequest.replace("##UUID##", uuid);

            if(this.active_layers) {
                request += this.active_layers.length ? ' and (symbolId like "' + this.active_layers.join('%" or symbolId like "') + '%" )' : ' and 1=2 ';
            }

            if(G3ME.map.getZoom() !== zoom){
                return G3ME.canvasTile.tileDrawn(canvas);
            }
            for (var i = 0, zones_length = this.site.zones.length, j = 0 ; i < zones_length; i++) {
                if (this.extents_match(this.site.zones[i].extent, tileExtent)) {
                    j++ ;
                    G3ME.requestPool[this.site.zones[i].database_name] = G3ME.requestPool[this.site.zones[i].database_name] || {} ;
                    G3ME.requestPool[this.site.zones[i].database_name][uuid] = {
                        request  : request,
                        initargs : initargs,
                        callback : (function(uuid, ctx, zoom, xmin, xscale, ymax,xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize,canvas, labelCache, drawnLabels) {
                            return function(results){
                                drawCanvasForZone(uuid, results, ctx, zoom, xmin, xscale, ymax,xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize,canvas, labelCache, drawnLabels);
                            };
                        })(uuid, ctx, zoom, xmin, xscale, ymax,xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize,canvas, labelCache, drawnLabels)
                    };
                }
            }
            G3ME.poolRequestInvokator();
            if(j===0){
                G3ME.canvasTile.tileDrawn(canvas);
            }
        },

        poolRequestInvokator: function(){
            clearTimeout(G3ME.poolRequestExecutorTimeout);
            G3ME.poolRequestExecutorTimeout = setTimeout(function(){
                G3ME.poolRequestExecutor(angular.copy(G3ME.requestPool));
                G3ME.requestPool={};
            }, 10);
        },

        poolRequestExecutor: function(pool){
            for(var databaseName in pool){
                var request = [];
                var args = [];
                for(var uuid in pool[databaseName]){
                    request.push(pool[databaseName][uuid].request);
                    args = args.concat(pool[databaseName][uuid].initargs);
                }
                request = request.join(' UNION ALL ') + ' ORDER BY tileUuid, symbolId ' ;

                (function(currentRequestPool, currentDb, req, castle){
                    SQLite.openDatabase({name: currentDb, bgType: 1}).transaction(function (tx) {
                        tx.executeSql(req, castle,
                            function (tx, results) {
                                for(var uuid in currentRequestPool){

                                    currentRequestPool[uuid].callback(results);
                                }
                            }, function(){console.log(arguments);})
                    });
                })(pool[databaseName], databaseName, request, args);
            }
        }
    };

    function drawCanvasForZone(uuid, results, ctx, zoom, xmin, xscale, ymax,xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, nwmerc, dotSize,canvas, labelCache, drawnLabels) {
            G3ME.myWorker.postMessage("asset");

        var rows = results.rows, previousSymbolId = null, changeContext = false, image, assetSymbology, uuidHasBeenSeen, currentMapBounds = G3ME.map.getBounds();

        if(!G3ME.extents_match({ xmin:xmin,xmax:xmax,ymin:ymin,ymax:ymax},{xmin:currentMapBounds._southWest.lng, xmax:currentMapBounds._northEast.lng,
                ymin:currentMapBounds._southWest.lat, ymax:currentMapBounds._northEast.lat })  || G3ME.map.getZoom() !== zoom ){
            return G3ME.canvasTile.tileDrawn(canvas);
        }

        for (var i = 0, length = rows.length; i < length; i++) {

            var asset = rows.item(i);
            // window.myWorker = G3ME.myWorker ;
            // window.myResults = results ;
            if(asset.tileUuid !== uuid && !uuidHasBeenSeen){
                continue ;
            } else if(asset.tileUuid === uuid && !uuidHasBeenSeen) {
                uuidHasBeenSeen = true ;
            } else if(asset.tileUuid !== uuid && uuidHasBeenSeen){
                return G3ME.canvasTile.tileDrawn(canvas);
            }

            var previousX = false, previousY = false, coord, coord_ = {}, x, y, geometry= JSON.parse(asset.geometry);

            if(changeContext = (previousSymbolId !== asset.symbolId)){
                assetSymbology  = G3ME.symbology[asset.symbolId];
                ctx.strokeStyle = assetSymbology.style.strokecolor;
                ctx.fillStyle   = assetSymbology.style.fillcolor;
                image           = G3ME.symbology[asset.symbolId.toString()].style.image;
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
                        _middle = {}, _segmentBegin = {};

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

                    addLabel(asset.maplabel, assetSymbology.label.size * 2, _middle.x, _middle.y, _middle.angle, assetSymbology.label.color, labelCache);
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
                    addLabel(asset.maplabel, image.width, coord_.x, coord_.y, null, assetSymbology.label.color, labelCache);
                }
            }

        }
        if (zoom > 16) {
            drawLabels(ctx, labelCache,drawnLabels);
        }
        G3ME.canvasTile.tileDrawn(canvas);
    }

    function drawLabel(ctx, txt, size, x, y, angle, color, drawnLabels) {
        ctx.save();
        var cur;
        if(ctx.fillStyle !== color.toLowerCase()){
            ctx.fillStyle = color;
        }
        for (var i = 0, lim = drawnLabels.length; i < lim; i++) {
            cur = drawnLabels[i];
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

        drawnLabels.push({
            x: x + offset_x,
            y: y + offset_y,
            width: _width
        });

        var newFont = (size / 2) + 'px Arial' ;
        if(ctx.font !== newFont){
            ctx.font = newFont;
        }
        ctx.strokeText(txt, offset_x, offset_y);
        ctx.fillText(txt, offset_x, offset_y);
        ctx.restore();
    }

    function drawLabels(ctx, labelCache, drawnLabels) {
        var cur;
        var lineWidth = ctx.lineWidth;
        var strokeStyle = ctx.strokeStyle;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'white';
        for (var i = 0, lim = labelCache.length; i < lim; i++) {
            cur = labelCache[i];
            drawLabel(ctx, cur.txt, cur.size, cur.x, cur.y, cur.angle, cur.color, drawnLabels);
        }
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
    }

    function addLabel(txt, size, x, y, angle, color, labelCache) {
        labelCache.push({
            txt: txt,
            x: x,
            y: y,
            size: size,
            color: color,
            angle: angle
        });
    }



    return G3ME;
});
