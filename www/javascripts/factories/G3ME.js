angular.module( 'smartgeomobile' ).factory( 'G3ME', function(SQLite, $rootScope, i18n, Storage, Site) {

    'use strict';


    var acos = Math.acos,
        sqrt = Math.sqrt,
        PI = Math.PI,
        log = Math.log,
        tan = Math.tan,
        pow = Math.pow,
        abs = Math.abs;

    var DEG2RAD = 0.017453292519943295,
        M_DEG2RAD = -0.017453292519943295,
        RAD2DEG = 180 / PI,
        H_DEG2RAD = 0.008726646259971648,
        PI_4 = PI / 4,
        INV_2PI = 0.15915494309189535,
        M_INV_2PI = -0.15915494309189535,
        INV_2PI_T_DEG2RAD = INV_2PI * DEG2RAD;


    var G3ME = {

        _MAX_ZOOM: 21,
        _MIN_ZOOM: 0,

        active_layers: false,
        assetsMarkers: [],

        mapDiv: null,
        mapDivId: "smartgeo-map",
        databases: {},

        requestPool: {},

        initialize: function(extent) {

            this.mapDiv = document.getElementById( this.mapDivId );
            this.symbology = Site.current.symbology;
            this.CURRENT_ZOOM = false;
            this.tileUrl = Site.current.EXTERNAL_TILEURL;
            this.crs = L.CRS.EPSG4326;
            this.margin = 0.00005;
            // Si la carte est déjà initialisée, on l'utilise pour récupérer les bounds
            if (this.map) {
                extent = this.map;
            }
            this.map = new L.map( this.mapDiv, {
                attributionControl: false,
                zoomControl: false,
                zoomAnimation: true,
                inertia: navigator.userAgent.match( /Android/i ) ? false : true,
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM,
                attribution: ''
            } ).addControl( L.control.zoom( {
                position: 'topright'
            } ) );

            L.control.scale( {
                'imperial': false
            } ).addTo( this.map );

            G3ME.map.fitBounds( extent );

            // this.tileUrl = 'http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
            if (!this.tileUrl || !this.tileUrl.length || Storage.get( 'intent' )) {
                this.tileUrl = Storage.get( 'url' ).replace( /index.php.+$/, '' );
                this.tileUrl += 'getTuileTMS.php?z={z}&x={x}&y={y}';
            }
            var BackgroundTile;
            if (navigator.userAgent.match( /Android/i )) {
                BackgroundTile = L.TileLayer.FileCache;
            } else {
                BackgroundTile = L.TileLayer;
            }
            this.BackgroundTile = new BackgroundTile( this.tileUrl, {
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM
            } ).addTo( this.map );

            this.canvasTile = new L.TileLayer.Canvas( {
                maxZoom: G3ME._MAX_ZOOM,
                minZoom: G3ME._MIN_ZOOM,
                async: true,
                updateWhenIdle: true
            } );

            this.canvasTile.drawTile = function(canvas, tilePoint) {
                G3ME.drawTile( canvas, tilePoint );
            };

            window.SMARTGEO_CURRENT_SITE_IMG = window.SMARTGEO_CURRENT_SITE_IMG || {};
            window.SMARTGEO_CURRENT_SITE_IMG_W = window.SMARTGEO_CURRENT_SITE_IMG_W || {};
            window.SMARTGEO_CURRENT_SITE_IMG_H = window.SMARTGEO_CURRENT_SITE_IMG_H || {};
            window.SMARTGEO_CURRENT_SITE_IMG_W_HALF = window.SMARTGEO_CURRENT_SITE_IMG_W_HALF || {};
            window.SMARTGEO_CURRENT_SITE_IMG_H_HALF = window.SMARTGEO_CURRENT_SITE_IMG_H_HALF || {};

            for (var symbol in Site.current.symbology) {
                if (!Site.current.symbology[symbol] || !Site.current.symbology[symbol].style) {
                    continue;
                }
                var image = new Image();
                image.src = Site.current.symbology[symbol].style.symbol.icon;
                window.SMARTGEO_CURRENT_SITE_IMG[symbol] = image;
                window.SMARTGEO_CURRENT_SITE_IMG_W[symbol] = image.width;
                window.SMARTGEO_CURRENT_SITE_IMG_H[symbol] = image.height;
                window.SMARTGEO_CURRENT_SITE_IMG_W_HALF[symbol] = image.width * -0.5;
                window.SMARTGEO_CURRENT_SITE_IMG_H_HALF[symbol] = image.height * -0.5;
            }

            this.canvasTile.addTo( this.map );

            return this.map;
        },

        //reset the extent map when change site, particulary use for siteInstall,changesit, and authentication.
        resetMap: function(){
            G3ME.map = null;
        },

        getActiveLayersForRequest: function() {
            if (!this.active_layers) {
                this.active_layers = [];
                for (var okey in Site.current.metamodel) {
                    if (Site.current.metamodel[okey].is_graphical) {
                        this.active_layers.push( okey );
                    }
                }
            } else {
                for (var i = 0; i < this.active_layers.length; i++) {
                    if (Site.current.metamodel[this.active_layers[i]] && !Site.current.metamodel[this.active_layers[i]].is_graphical) {
                        this.active_layers.splice( i, 1 );
                    }
                }
            }
            return this.active_layers.join( '%" or symbolId like "' );
        },

        reloadLayers: function() {
            for (var i in G3ME.map._layers) {
                if (G3ME.map._layers[i].redraw && !G3ME.map._layers[i]._url) {
                    G3ME.map._layers[i].redraw();
                }
            }
        },

        zoomOnAsset: function(asset) {
            G3ME.map.setView( G3ME.getLineStringMiddle( asset.geometry.coordinates ), 18 );
            G3ME.invalidateMapSize();
        },

        getLineStringMiddle: function(lineString) {
            var lineStringLength = 0;
            var coords = lineString.coordinates;
            for (var i = 0; i < coords.length - 1; i++) {
                var p1 = coords[i];
                var p2 = coords[i + 1];
                p1[2] = lineStringLength;
                lineStringLength += sqrt( pow( p2[0] - p1[0], 2 ) + pow( p2[1] - p1[1], 2 ) );
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

        invalidateMapSize: function(timeout, callback) {
            timeout = timeout || 10;
            setTimeout( function() {
                G3ME.map.invalidateSize();
                (callback || function() {})();
            }, 10 );
        },

        getExtentsFromAssetsList: function(assets) {
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

        extents_match: function(container, contained) {
            return !(container.xmax < contained.xmin ||
                container.xmin > contained.xmax ||
                container.ymin > contained.ymax ||
                container.ymax < contained.ymin);
        },

        fullscreen: function() {
            document.getElementById( G3ME.mapDivId ).style.width = "100%";
            G3ME.invalidateMapSize();
        },

        reduceMapWidth: function(px) {
            document.getElementById( G3ME.mapDivId ).style.width = (window.innerWidth - px) + 'px';
            G3ME.invalidateMapSize();
        },

        setVisibility: function(groups) {
            this.active_layers = [];
            for (var j in groups) {
                var layers = groups[j].layers;
                for (var i in layers) {
                    if (layers[i].status) {
                        this.active_layers.push( i );
                    }
                }
            }
            this.canvasTile.redraw();
        },
        getVisibility: function() {
            if (!this.active_layers) {
                return false;
            }
            var visibilities = {};
            for (var i in this.active_layers) {
                visibilities[this.active_layers[i]] = true;
            }
            return visibilities;
        },

        baseRequest: " SELECT '##UUID##' as tileUuid, geometry, symbolId, maplabel, angle FROM ASSETS  WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) AND ( ( minzoom <= 1*? OR minzoom = 'null' ) AND ( maxzoom >= 1*? OR maxzoom = 'null' ) ) ",

        drawTile: function(canvas, tilePoint) {
            var ctx = canvas.getContext( '2d' ),
                zoom = this.map.getZoom(),
                nwPoint = tilePoint.multiplyBy( 256 ),
                sePoint = nwPoint.add( new L.Point( 256, 256 ) ),
                nw = this.crs.project( this.map.unproject( nwPoint, zoom ) ),
                se = this.crs.project( this.map.unproject( sePoint, zoom ) ),
                nwmerc = this.map.latLngToLayerPoint( {
                    lat: nw.y,
                    lng: nw.x
                } ),

                margin = 0.00005,
                ymin = se.y - margin,
                ymax = nw.y + margin,
                xmin = nw.x - margin,
                xmax = se.x + margin,
                scale = 256 * pow( 2, zoom ),
                xscale = 256 / abs( xmax - xmin ),
                yscale = 256 / abs( ymax - ymin ),
                buffer = 100 / xscale,
                initialTopLeftPointX = this.map._initialTopLeftPoint.x + nwmerc.x,
                initialTopLeftPointY = this.map._initialTopLeftPoint.y + nwmerc.y;

            var initargs = [xmin - buffer, xmax + buffer, ymin - buffer, ymax + buffer, zoom, zoom],
                tileExtent = {
                    ymin: ymin,
                    ymax: ymax,
                    xmin: xmin,
                    xmax: xmax
                },
                uuid = window.uuid(),
                request = G3ME.baseRequest.replace( "##UUID##", uuid ) + ' and (symbolId like "' + G3ME.getActiveLayersForRequest() + '%" )';

            if (G3ME.map.getZoom() !== zoom) {
                return G3ME.canvasTile.tileDrawn( canvas );
            }
            for (var i = 0, zones_length = window.SMARTGEO_CURRENT_SITE.zones.length, j = 0; i < zones_length; i++) {
                if (this.extents_match( window.SMARTGEO_CURRENT_SITE.zones[i].extent, tileExtent )) {
                    j++;
                    G3ME.requestPool[window.SMARTGEO_CURRENT_SITE.zones[i].database_name] = G3ME.requestPool[window.SMARTGEO_CURRENT_SITE.zones[i].database_name] || {};
                    G3ME.requestPool[window.SMARTGEO_CURRENT_SITE.zones[i].database_name][uuid] = {
                        request: request,
                        initargs: initargs,
                        callback: ( function(uuid, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, canvas) {
                            return function(results) {
                                drawCanvasForZone( uuid, results, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, canvas );
                            };
                        } ) ( uuid, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, canvas )
                    };
                }
            }
            G3ME.poolRequestInvokator();
            if (j === 0) {
                G3ME.canvasTile.tileDrawn( canvas );
            }
        },

        poolRequestInvokator: function() {
            // clearTimeout( G3ME.poolRequestExecutorTimeout );
            // G3ME.poolRequestExecutorTimeout = setTimeout( function() {
            G3ME.poolRequestExecutor( angular.copy( G3ME.requestPool ) );
            G3ME.requestPool = {};
        // }, 20 );
        },

        poolRequestExecutor: function(pool) {
            for (var databaseName in pool) {
                var request = [];
                var args = [];
                for (var uuid in pool[databaseName]) {
                    request.push( pool[databaseName][uuid].request );
                    args = args.concat( pool[databaseName][uuid].initargs );
                }
                request = request.join( ' UNION ALL ' ) + ' ORDER BY tileUuid, symbolId DESC';
                G3ME.prevAnonFunction( pool[databaseName], databaseName, request, args );
            }
        },

        prevAnonFunction: function(currentRequestPool, currentDb, req, args) {
            var db;
            if (typeof device != 'undefined' && device.platform == "Android" && parseInt(device.version) >= 5) {
                db = SQLite.openDatabase({name: currentDb, bgType: 1, androidOldDatabaseImplementation: 2});
            }
            else {
                db = SQLite.openDatabase({name: currentDb, bgType: 1});
            }
            db.transaction( function(tx) {
                tx.executeSql( req, args, function(tx, results) {
                    for (var uuid in currentRequestPool) {
                        currentRequestPool[uuid].callback( results );
                    }
                }, function(tx, sqlerror) {
                    console.error( req, args, sqlerror.message );
                } );
            } );
        }
    };

    function drawCanvasForZone(uuid, results, ctx, zoom, xmin, xscale, ymax, xmax, ymin, yscale, scale, initialTopLeftPointX, initialTopLeftPointY, canvas) {

        var rows = results.rows,
            currentMapBounds = G3ME.map.getBounds(),
            labelCache = [],
            drawnLabels = [],
            zoomUpper16 = zoom > 16,
            previousX , previousY , coord, geometry , symbolId , _middlex, _middley, _middleangle,
            coord_x, coord_y, dx, dy , asset, imageWidth, imageHeight, imageWidthHalf, imageHeightHalf,
            previousSymbolId, image, assetSymbology, uuidHasBeenSeen;

        if (!G3ME.extents_match( {
                xmin: xmin,
                xmax: xmax,
                ymin: ymin,
                ymax: ymax
            }, {
                xmin: currentMapBounds._southWest.lng,
                xmax: currentMapBounds._northEast.lng,
                ymin: currentMapBounds._southWest.lat,
                ymax: currentMapBounds._northEast.lat
            } ) || G3ME.map.getZoom() !== zoom) {
            return G3ME.canvasTile.tileDrawn( canvas );
        }
        for (var i = 0, length = rows.length; i < length; i++) {

            asset = rows.item( i );
            geometry = JSON.parse( asset.geometry );

            if (asset.tileUuid !== uuid && !uuidHasBeenSeen) {
                continue;
            } else if (asset.tileUuid === uuid && !uuidHasBeenSeen) {
                uuidHasBeenSeen = true;
            } else if (asset.tileUuid !== uuid && uuidHasBeenSeen) {
                if (zoomUpper16) {
                    drawLabels( ctx, labelCache, drawnLabels );
                }
                return G3ME.canvasTile.tileDrawn( canvas );
            }

            if ( (previousSymbolId !== (symbolId = "" + asset.symbolId)) ) {
                assetSymbology = G3ME.symbology[symbolId];
                if (!assetSymbology) {
                    symbolId += '0';
                    assetSymbology = G3ME.symbology[symbolId];
                }
                if (!assetSymbology) {
                    continue;
                }
                ctx.strokeStyle = assetSymbology.style.strokecolor;
                ctx.fillStyle = assetSymbology.style.fillcolor;
                image = window.SMARTGEO_CURRENT_SITE_IMG[symbolId];
                imageWidth = window.SMARTGEO_CURRENT_SITE_IMG_W[symbolId];
                imageHeight = window.SMARTGEO_CURRENT_SITE_IMG_H[symbolId];
                imageWidthHalf = window.SMARTGEO_CURRENT_SITE_IMG_W_HALF[symbolId];
                imageHeightHalf = window.SMARTGEO_CURRENT_SITE_IMG_H_HALF[symbolId];
                previousSymbolId = symbolId;
            }

            if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
                geometry.coordinates = geometry.coordinates[0];
            }
            if (geometry.type !== "Point") {
                previousX = false;
                previousY = false;
                ctx.beginPath();
                for (var j = 0, l = geometry.coordinates.length; j < l; j++) {
                    coord = geometry.coordinates[j];
                    if (!zoomUpper16) {
                        coord_x = (0.5 + ((coord[0] - xmin) * xscale)) | 0;
                        coord_y = (0.5 + ((ymax - coord[1]) * yscale)) | 0;
                    } else {
                        coord_x = (0.5 + scale * (INV_2PI_T_DEG2RAD * coord[0] + 0.5) - initialTopLeftPointX) | 0;
                        coord_y = (0.5 + scale * (M_INV_2PI * log( tan( PI_4 + (coord[1] * H_DEG2RAD) ) ) + 0.5) - initialTopLeftPointY) | 0;
                    }

                    if (!previousX) {
                        ctx.moveTo( coord_x, coord_y );
                    } else if (coord_x === previousX && coord_y === previousY) {
                        continue;
                    } else {
                        ctx.lineTo( coord_x, coord_y );
                    }

                    previousX = coord_x;
                    previousY = coord_y;
                }
                if (geometry.type !== "Polygon" && zoomUpper16 && asset.maplabel) {
                    if (asset.maplabel.match( /Vauban/i )) {
                        //    debugger;
                    }

                    var middle = G3ME.getLineStringMiddle( geometry );

                    _middlex = (0.5 + scale * (INV_2PI_T_DEG2RAD * middle[1] + 0.5) - initialTopLeftPointX) | 0;
                    _middley = (0.5 + scale * (M_INV_2PI * log( tan( PI_4 + (middle[0] * H_DEG2RAD) ) ) + 0.5) - initialTopLeftPointY) | 0;

                    dx = _middlex - (0.5 + scale * (INV_2PI_T_DEG2RAD * middle[2][0] + 0.5) - initialTopLeftPointX) | 0;
                    dy = _middley - (0.5 + scale * (M_INV_2PI * log( tan( PI_4 + (middle[2][1] * H_DEG2RAD) ) ) + 0.5) - initialTopLeftPointY) | 0;

                    if (dy < 0) {
                        dx = -dx;
                    }

                    _middleangle = acos( dx / sqrt( dx * dx + dy * dy ) ) * RAD2DEG;

                    if (_middleangle > 90) {
                        _middleangle -= 180;
                    }

                    labelCache.push( {
                        txt: asset.maplabel.replace( /&#039;/g, "'" ).replace( /\\\\/g, "\\" ),
                        x: _middlex,
                        y: _middley,
                        size: assetSymbology.label.size * 3,
                        color: assetSymbology.label.color,
                        angle: _middleangle
                    } );
                }
                ctx.stroke();
                if (geometry.type === "Polygon") {
                    ctx.fill();
                }
            } else {
                coord_x = (0.5 + scale * (INV_2PI_T_DEG2RAD * geometry.coordinates[0] + 0.5) - initialTopLeftPointX) | 0;
                coord_y = (0.5 + scale * (M_INV_2PI * log( tan( PI_4 + (geometry.coordinates[1] * H_DEG2RAD) ) ) + 0.5) - initialTopLeftPointY) | 0;
                ctx.save();
                ctx.translate( coord_x, coord_y );
                if (asset.angle % 360) {
                    ctx.rotate( asset.angle * M_DEG2RAD );
                }
                ctx.drawImage( image, imageWidthHalf, imageHeightHalf, imageWidth, imageHeight );
                ctx.restore();
                if (zoomUpper16 && asset.maplabel) {
                    labelCache.push( {
                        txt: asset.maplabel, //.replace( /&#039;/g, "'" ).replace( /\\\\/g, "\\" ), // FAUT FAIRE CA A L'INSTALL
                        x: coord_x,
                        y: coord_y,
                        size: imageWidth,
                        color: assetSymbology.label.color,
                        angle: null
                    } );
                }
            }
        }
        if (zoomUpper16) {
            drawLabels( ctx, labelCache, drawnLabels );
        }
        G3ME.canvasTile.tileDrawn( canvas );
    }

    function isThereAnAutoCollision(x, y, width, height, drawnLabels_) {
        var cur, intersectXmin, intersectXmax, intersectYmin, intersectYmax,
            myXmin = x,
            myYmin = y,
            myXmax = x + width,
            myYmax = y + height;

        for (var i = 0, lim = drawnLabels_.length; i < lim; i++) {
            cur = drawnLabels_[i];
            intersectXmin = (cur.xmin > myXmin) ? cur.xmin : myXmin;
            intersectXmax = (cur.xmax < myXmax) ? cur.xmax : myXmax;
            intersectYmin = (cur.ymin > myYmin) ? cur.ymin : myYmin;
            intersectYmax = (cur.ymax < myYmax) ? cur.ymax : myYmax;
            if (intersectXmin < intersectXmax && intersectYmin < intersectYmax) {
                return true;
            }
        }
        return false;
    }


    function drawLabel(ctx, txt, size, x, y, angle, color, drawnLabels_) {
        // Cette évaluation de la longueur du texte est très pessimiste,
        // mais l'appel à ctx.measureText() est très lent.
        var _height = size * 0.5,
            _width = _height * txt.length,
            offset_x = angle ? _width * -0.5 : _height + 1,
            offset_y = angle ? -4 : 0,
            newFont = _height + 'px Arial',
            tolerance = 3,
            curx = x + offset_x,
            cury = y + offset_y;

        if (ctx.font !== newFont) {
            ctx.font = newFont;
        }

        if (isThereAnAutoCollision( curx, cury, _width, _height, drawnLabels_ )) {
            return;
        }

        ctx.save();
        if (ctx.fillStyle.toLowerCase() !== color.toLowerCase()) {
            ctx.fillStyle = color;
        }

        ctx.translate( x, y );
        if (angle) {
            ctx.rotate( angle * DEG2RAD );
        }
        ctx.strokeText( txt, offset_x, offset_y );
        ctx.fillText( txt, offset_x, offset_y );
        ctx.restore();

        drawnLabels_.push( {
            xmin: curx - tolerance,
            xmax: curx + _width + tolerance,
            ymin: cury - tolerance,
            ymax: cury + _height + tolerance
        } );
    }

    function drawLabels(ctx, labelCache_, drawnLabels_) {
        var cur,
            lineWidth = ctx.lineWidth,
            strokeStyle = ctx.strokeStyle;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'white';
        for (var i = 0, lim = labelCache_.length; i < lim; i++) {
            cur = labelCache_[i];
            drawLabel( ctx, cur.txt, cur.size, cur.x, cur.y, cur.angle, cur.color, drawnLabels_ );
        }
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
    }
    return G3ME;
} );
