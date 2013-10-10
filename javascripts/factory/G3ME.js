angular.module('smartgeomobile').factory('G3ME', function(SQLite, Smartgeo){
    var G3ME = {

        active_layers : false,
        assetsMarkers : [],

        mapDiv : null,
        mapDivId: null,

        initialize : function(mapDivId, site, extent){

            this.site    = site;
            this.tileUrl = this.site.EXTERNAL_TILEURL;
            this.mapDiv  = document.getElementById(mapDivId) ;
            this.map     = new L.map(this.mapDiv, {
                attributionControl: false,
                zoomControl: false,
                maxZoom: Smartgeo.MAX_ZOOM,
                minZoom: Smartgeo.MIN_ZOOM
            }).addControl(L.control.zoom({
                position: 'topright'
            }));

            if(!extent){
                extent = [
                    [this.site.extent.ymin, this.site.extent.xmin],
                    [this.site.extent.ymax, this.site.extent.xmax]
                ];
            }

            G3ME.map.fitBounds(extent);
            G3ME.invalidateMapSize();

            if(!this.tileUrl){
                this.tileUrl  = Smartgeo.get('url').replace(/index.php.+$/, '');
                this.tileUrl += 'getTuileTMS.php?z={z}&x={x}&y={y}';
            }

            this.backgroundTile = new L.TileLayer(this.tileUrl, {
                maxZoom: Smartgeo.MAX_ZOOM,
                minZoom: Smartgeo.MIN_ZOOM
            }).addTo(this.map);

            this.canvasTile = new L.TileLayer.Canvas({
                maxZoom: Smartgeo.MAX_ZOOM,
                minZoom: Smartgeo.MIN_ZOOM
            }).addTo(this.map);

            this.canvasTile.drawTile = function(canvas, tilePoint) {
                G3ME.drawTile(canvas, tilePoint);
            };

            for(var symbol in this.site.symbology){
                if (!this.site.symbology[symbol] || !this.site.symbology[symbol].style) {
                    continue;
                }
                var image = new Image();
                image.src = this.site.symbology[symbol].style.symbol.icon;
                this.site.symbology[symbol].style.image = image;
            }
            this.canvasTile.redraw();
        },

        invalidateMapSize : function(timeout){
            timeout = timeout || 10;
            setTimeout(function() {
                G3ME.map.invalidateSize();
            }, 10);
        },

        extents_match : function(extent1, extent2){
            return extent1.xmax > extent2.xmin &&
                extent2.xmax > extent1.xmin &&
                extent1.ymax > extent2.ymin &&
                extent2.ymax > extent1.ymin;
        },
        setVisibility: function(layers) {
            this.active_layers = [];
            for(var i in layers) {
                if(layers[i].status) {
                    this.active_layers.push(i);
                }
            }
            this.canvasTile.redraw();
        },
        getVisibility: function() {
            if(this.active_layers === false) {
                return false;
            }
            var rv = {};
            for(var i in this.active_layers) {
                rv[this.active_layers[i]] = true;
            }
            return rv;
        },
        drawTile : function(canvas, tilePoint) {
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
                imageFactor = Math.floor(30 / (22 - zoom)) / 10,
                imageFactor_2 = imageFactor / 2,
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
                var lineWidth = ctx.lineWidth;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                for (var i = 0, lim = labelCache.length; i < lim; i++) {
                    cur = labelCache[i];
                    drawLabel(ctx, cur.txt, cur.size, cur.x, cur.y);
                }
                ctx.lineWidth = lineWidth;
            }

            function addLabel(txt, size, x, y) {
                labelCache.push({
                    txt: txt,
                    x: x,
                    y: y,
                    size: size
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

            // var request = "SELECT angle, geometry, symbolId, minzoom, maxzoom FROM ASSETS ";
            var request = "SELECT * FROM ASSETS ";
            request += "WHERE ( xmax > ? AND ? > xmin AND ymax > ? AND ? > ymin) ";
            request += "      AND ( (minzoom <= 1*? and maxzoom >= 1*? ) or (minzoom IS NULL OR maxzoom IS NULL) ) ";
            if(this.active_layers) {
                request += this.active_layers.length ? ' and (symbolId like "' + this.active_layers.join('%" or symbolId like "') + '%" )' : ' and 1=2 ';
            }
            for (i = 0; i < this.site.zones.length; i++) {
                if (this.extents_match(this.site.zones[i].extent, tileExtent)) {
                    SQLite.openDatabase({
                        name: this.site.zones[i].database_name,
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
                                                if (zoom > 16 && asset.maplabel) {
                                                    addLabel(asset.maplabel, image.width, coord_.x, coord_.y);
                                                }
                                            } else {
                                                ctx.beginPath();
                                                ctx.arc(coord_.x, coord_.y, dotSize, 0, _2pi, true);
                                                ctx.fillStyle = symbology[asset.symbolId].style.fillcolor;
                                                ctx.fill();
                                                ctx.fillText(asset.maplabel, coord_.x + 1, coord_.y + 1);
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
});
