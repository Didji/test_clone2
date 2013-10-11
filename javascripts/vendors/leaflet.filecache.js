L.TileLayer.FileCache = L.TileLayer.extend({
    includes: L.Mixin.Events,

    options: {
        minZoom: 0,
        maxZoom: 18,
        tileSize: 256,
        subdomains: 'abc',
        errorTileUrl: '',
        attribution: '',
        zoomOffset: 0,
        opacity: 1,
        /*
        maxNativeZoom: null,
        zIndex: null,
        tms: false,
        continuousWorld: false,
        noWrap: false,
        zoomReverse: false,
        detectRetina: false,
        reuseTiles: false,
        bounds: false,
        */
        unloadInvisibleTiles: L.Browser.mobile,
        updateWhenIdle: L.Browser.mobile
    },
    initialize: function (url, options) {
        options = L.setOptions(this, options);

        // detecting retina displays, adjusting tileSize and zoom levels
        if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {

            options.tileSize = Math.floor(options.tileSize / 2);
            options.zoomOffset++;

            if (options.minZoom > 0) {
                options.minZoom--;
            }
            this.options.maxZoom--;
        }

        if (options.bounds) {
            options.bounds = L.latLngBounds(options.bounds);
        }

        this._url = url;

        var subdomains = this.options.subdomains;

        if (typeof subdomains === 'string') {
            this.options.subdomains = subdomains.split('');
        }
        this.initFS();
    },

    onAdd: function(map, insertAtTheBottom) {
        this._map = map;
        this._insertAtTheBottom = insertAtTheBottom;

        // create a container div for tiles
        this._initContainer();

        // create an image to clone for tiles
        this._createTileProto();

        // set up events
        map.on('viewreset',
            function(e) {
                this._reset(e.hard);
            },
            this);

        if (this.options.updateWhenIdle) {
            map.on('moveend', this._update, this);
        } else {
            this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
            map.on('move', this._limitedUpdate, this);
        }

        this._reset();
        this._update();
    },

    onRemove: function(map) {
        this._map.getPanes().tilePane.removeChild(this._container);
        this._container = null;

        this._map.off('viewreset', this._reset, this);

        if (this.options.updateWhenIdle) {
            this._map.off('moveend', this._update, this);
        } else {
            this._map.off('move', this._limitedUpdate, this);
        }
    },

    getAttribution: function() {
        return this.options.attribution;
    },

    setOpacity: function(opacity) {
        this.options.opacity = opacity;

        this._setOpacity(opacity);

        // stupid webkit hack to force redrawing of tiles
        if (L.Browser.webkit) {
            for (i in this._tiles) {
                this._tiles[i].style.webkitTransform += ' translate(0,0)';
            }
        }
    },

    _setOpacity: function(opacity) {
        if (opacity < 1) {
            L.DomUtil.setOpacity(this._container, opacity);
        }
    },

    _initContainer: function() {
        var tilePane = this._map.getPanes().tilePane,
            first = tilePane.firstChild;

        if (!this._container || tilePane.empty) {
            this._container = L.DomUtil.create('div', 'leaflet-layer');

            if (this._insertAtTheBottom && first) {
                tilePane.insertBefore(this._container, first);
            } else {
                tilePane.appendChild(this._container);
            }

            this._setOpacity(this.options.opacity);
        }
    },

    _reset: function(clearOldContainer) {
        this._tiles = {};
        if (clearOldContainer && this._container)
            this._container.innerHTML = "";
        this._initContainer();
        this._container.innerHTML = '';
    },

    _update: function() {
        var bounds = this._map.getPixelBounds(),
            tileSize = this.options.tileSize;

        var nwTilePoint = new L.Point(
                Math.floor(bounds.min.x / tileSize),
                Math.floor(bounds.min.y / tileSize)),
            seTilePoint = new L.Point(
                Math.floor(bounds.max.x / tileSize),
                Math.floor(bounds.max.y / tileSize)),
            tileBounds = new L.Bounds(nwTilePoint, seTilePoint);

        this._addTilesFromCenterOut(tileBounds);

        if (this.options.unloadInvisibleTiles) {
            this._removeOtherTiles(tileBounds);
        }
    },

    _addTilesFromCenterOut: function(bounds) {
        var queue = [],
            center = bounds.getCenter();

        for (var j = bounds.min.y; j <= bounds.max.y; j++) {
            for (var i = bounds.min.x; i <= bounds.max.x; i++) {
                if ((i + ':' + j) in this._tiles) { continue; }
                queue.push(new L.Point(i, j));
            }
        }

        // load tiles in order of their distance to center
        queue.sort(function(a, b) {
            return a.distanceTo(center) - b.distanceTo(center);
        });

        var fragment = document.createDocumentFragment();

        this._tilesToLoad = queue.length;
        for (var k = 0, len = this._tilesToLoad; k < len; k++) {
            this._addTile(queue[k], fragment);
        }

        this._container.appendChild(fragment);
    },

    _removeOtherTiles: function(bounds) {
        var kArr, x, y, key;

        for (key in this._tiles) {
            if (this._tiles.hasOwnProperty(key)) {
                kArr = key.split(':');
                x = parseInt(kArr[0], 10);
                y = parseInt(kArr[1], 10);

                // remove tile if it's out of bounds
                if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {

                    // evil, don't do this! crashes Android 3, produces load errors, doesn't solve memory leaks
                    // this._tiles[key].src = '';

                    if (this._tiles[key].parentNode == this._container) {
                        this._container.removeChild(this._tiles[key]);
                    }
                    delete this._tiles[key];
                }
            }
        }
    },

    _addTile: function(tilePoint, container) {
        var tilePos = this._getTilePos(tilePoint),
            zoom = this._map.getZoom(),
            key = tilePoint.x + ':' + tilePoint.y,
            tileLimit = (1 << zoom);

        // wrap tile coordinates
        if (!this.options.continuousWorld) {
            if (!this.options.noWrap) {
                tilePoint.x = ((tilePoint.x % tileLimit) + tileLimit) % tileLimit;
            } else if (tilePoint.x < 0 || tilePoint.x >= tileLimit) {
                this._tilesToLoad--;
                return;
            }

            if (tilePoint.y < 0 || tilePoint.y >= tileLimit) {
                this._tilesToLoad--;
                return;
            }
        }

        // create tile
        var tile = this._createTile();
        L.DomUtil.setPosition(tile, tilePos);

        this._tiles[key] = tile;

        if (this.options.scheme == 'tms') {
            tilePoint.y = tileLimit - tilePoint.y - 1;
        }

        this._loadTile(tile, tilePoint, zoom);

        container.appendChild(tile);
    },

    _getTilePos: function(tilePoint) {
        var origin = this._map.getPixelOrigin(),
            tileSize = this.options.tileSize;

        return tilePoint.multiplyBy(tileSize).subtract(origin);
    },

    getTileUrl: function(tilePoint, zoom) {
        var subdomains = this.options.subdomains,
            s = this.options.subdomains[(tilePoint.x + tilePoint.y) % subdomains.length];

        return this._url
                .replace('{s}', s)
                .replace('{z}', zoom)
                .replace('{x}', tilePoint.x)
                .replace('{y}', tilePoint.y);
    },

    _createTileProto: function() {
        this._tileImg = L.DomUtil.create('img', 'leaflet-tile');
        this._tileImg.galleryimg = 'no';

        var tileSize = this.options.tileSize;
        this._tileImg.style.width = tileSize + 'px';
        this._tileImg.style.height = tileSize + 'px';
    },

    _createTile: function() {
        var tile = this._tileImg.cloneNode(false);
        tile.onselectstart = tile.onmousemove = L.Util.falseFn;
        return tile;
    },

    _loadTile: function(tile, tilePoint, zoom) {
        tile._layer  = this;
        tile.onload  = this._tileOnLoad;
        tile.onerror = this._tileOnError;
        this._getTile(tile, tilePoint,zoom);
    },

    //MyCode

    _getTile: function(image,tilePoint,zoom){
        this.fetchTileFromCache(image,zoom,tilePoint.x,tilePoint.y);
    },

    initFS: function(grantedBytes){
        grantedBytes = grantedBytes || 100*1024*1024;
        var this_ = this ;

        this.requestQuota(function(){
            (window.requestFileSystem || window.webkitRequestFileSystem)(window.PERSISTENT,grantedBytes, function(fs){
                console.log('Opened file system: ' + fs.name);
                this_.filesystem = fs ;
            }, this_.log_fs_error);
        });
    },

    log_fs_error: function(e){
        var msg = '';
        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        }
        console.log('Error: ' + msg);
    },

    requestQuota: function(callback){
         window.requestFileSystem
        if(navigator.webkitPersistentStorage){
            navigator.webkitPersistentStorage.requestQuota(1024*1024*500, callback);
        } else if(window.storageInfo) {
            window.storageInfo.requestQuota(window.PERSISTENT, 0, callback);
        } else {
            console.log("no filesystem found");
            callback();
        }
    },

    getTilePath : function(tile){
        return 'tiles/'+tile.z ; //+'/'+tile.x ;
    },

    createDirectory: function(path, callback, step){
        step = step || 1 ;

        if(step > path.length)
            return callback();

        var this_ = this ;

        this.filesystem.root.getDirectory(path.split('/').slice(0,step).join('/'), {create: true}, function(dirEntry) {
            this_.createDirectory(path, callback, ++step);
        }, this_.log_fs_error);

    },


    writeTileToCache: function(tileObject, dataUrl, callback){

        var this_ = this ;
        var path  = this.getTilePath(tileObject);

        var data = this.convertDataURIToBinary(dataUrl);

        this.createDirectory(path, function(){
            this_.filesystem.root.getFile(path+'/'+tileObject.x+'_'+tileObject.y+'.png', {create: true}, function(fileEntry) {
                fileEntry.createWriter(function(writer) {
                    writer.onwriteend = (callback || function(){});
                    writer.onerror = function(e) {
                        console.log('Write failed: ' + e.toString());
                    };

                    var blob , datatype ='image/png';

                    try {
                        // Chrome browser
                        blob = new Blob([data], {type: datatype});
                        writer.write(blob);
                    } catch (e) {
                        window.BlobBuilder = window.BlobBuilder ||  window.WebKitBlobBuilder;
                        if (e.name == 'TypeError' && window.BlobBuilder) {
                            // Android browser
                            cordova.exec(
                                function() {
                                    console.log('Fichier écrit avec succes');
                                },
                                function(error) {
                                    console.log(JSON.stringify(error));
                                },
                                "WriteFilePlugin",
                                "writeBase64toPNG", [dataUrl.split(',')[1],path+'/'+tileObject.x+'_'+tileObject.y+'.png' ]
                            );

                        } else if (e.name == "InvalidStateError") {
                            blob = new Blob([data], {type: datatype});
                            writer.write(blob);
                        } else {
                            console.log("Error when building blob");
                        }
                    }

                }, this_.log_fs_error);
            }, this_.log_fs_error);
        });
    },

    getDataURL: function (img) {
        canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL();
    },

    fetchTileFromCache: function(image,z,x,y){
        // console.log("fetchTileFromCache")

        var this_ = this ;

        if(!this.filesystem){
            return setTimeout(function() {
                this_.fetchTileFromCache(image, z, x, y);
            }, 400);
        }

        var tileObject = {
            image : image,
            provider : this.id,
            x : x,
            y : y,
            z : z,
            src : null,
            tiles : this
        };

        this.filesystem.root.getFile(this.getTilePath(tileObject)+'/'+tileObject.x+'_'+tileObject.y+'.png', {}, function(fileEntry) {
            fileEntry.file(function(file) {
                var reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onloadend = function(event) {
                    var data = event.target.result, datatype = "image/png", blob, bb;
                    try {
                        blob = new Blob([data], {type: datatype});
                    } catch (e) {
                        window.BlobBuilder = window.BlobBuilder ||  window.WebKitBlobBuilder;
                        if (e.name == 'TypeError' && window.BlobBuilder) {
                            bb = new BlobBuilder();
                            bb.append(data);
                            blob = bb.getBlob(datatype);
                        } else if (e.name == "InvalidStateError") {
                            blob = new Blob([data], {type: datatype});
                        } else {
                            console.log("Error when building blob");
                        }
                    }
                    // image.style.border  = 'solid 1px blue';
                    window.URL = window.URL || window.webkitURL;
                    image.src           =   URL.createObjectURL(blob);

                    this_.doINeedToReCacheThisTile(tileObject, file, function(yes){
                        if(yes){
                            image.src = this_.getTileUrl({x:x, y:y},z);
                            image.onload = function(){
                                image.className += " leaflet-tile-loaded";
                                this_.writeTileToCache(tileObject, this_.getDataURL(image), function(){
                                    this_.getRemoteETag(   tileObject, function(remoteETag){
                                        this_.writeMetadataTileFile(tileObject,{
                                            etag : remoteETag
                                        });
                                    });
                                });
                            };
                        }
                    });
                };
            });

        }, function(fileError){
            // image.style.border  = 'solid 1px red';
            image.src = this_.getTileUrl({x:x, y:y},z);
            image.onload = function(){
                image.className += " leaflet-tile-loaded";
                this_.writeTileToCache(tileObject, this_.getDataURL(image));
            };
        });
    },

    readMetadataTileFile: function(tileObject, callback){
        this.filesystem.root.getFile(this.getTilePath(tileObject)+'/'+tileObject.x+'_'+tileObject.y+'.png.metadata', {create: true}, function(fileEntry) {
            fileEntry.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(){
                var metadata = JSON.parse(reader.result || '{}');
                callback(metadata);
            };
            reader.readAsText(file);
            });
        });
    },

    writeMetadataTileFile: function(tileObject, metadata, callback){
        var _this = this ;
        this.filesystem.root.getFile(this.getTilePath(tileObject)+'/'+tileObject.x+'_'+tileObject.y+'.png.metadata', {create: false}, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
                writer.onwriteend = (callback || function(){});
                writer.onerror = function(e) {
                    console.log('Write failed: ' + e.toString());
                };
                var blob , datatype ='text/plain';
                try {
                    // Chrome browser
                    blob = new Blob([JSON.stringify(metadata)], {type: datatype});
                    writer.write(blob);
                } catch (e) {
                    window.BlobBuilder = window.BlobBuilder ||  window.WebKitBlobBuilder;
                    if (e.name == 'TypeError' && window.BlobBuilder) {
                        // Android browser
                        // cordova.exec(
                        //     function() {
                        //         console.log('Fichier écrit avec succes');
                        //     },
                        //     function(error) {
                        //         console.log(JSON.stringify(error));
                        //     },
                        //     "WriteFilePlugin",
                        //     "writeBase64toPNG", [dataUrl.split(',')[1],path+'/'+tileObject.x+'_'+tileObject.y+'.png' ]
                        // );

                    } else if (e.name == "InvalidStateError") {
                        blob = new Blob([JSON.stringify(metadata)], {type: datatype});
                        writer.write(blob);
                    } else {
                        console.log("Error when building blob");
                    }
                }
            }, _this.log_fs_error);
        });
    },

    doINeedToReCacheThisTile: function(tileObject, file, callback){
        var _this = this ;
        this.readMetadataTileFile(tileObject, function(metadata){
            if(!metadata.etag){
                callback(true);
            } else {
                _this.getRemoteETag(tileObject, function(remoteETag){
                    if(metadata.etag != remoteETag){
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }
        });
    },

    getRemoteETag: function(tileObject, callback){
        var http = new XMLHttpRequest(),
            url  = this.getTileUrl({x:tileObject.x, y:tileObject.y},tileObject.z);
        http.open('HEAD', url);
        http.onreadystatechange = function() {
            if (this.readyState == this.DONE) {
                callback(this.getResponseHeader("etag"));
            }
        };
        http.send();
    },

    convertDataURIToBinary: function (dataURI) {
        var BASE64_MARKER = ';base64,';
        var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        var base64 = dataURI.substring(base64Index);
        var raw = window.atob(base64);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));

        for (i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    },

    ///end of my code

    _tileOnLoad: function(e) {
        var layer = this._layer;

        this.className += ' leaflet-tile-loaded';

        layer.fire('tileload', {tile: this, url: this.src});

        layer._tilesToLoad--;
        if (!layer._tilesToLoad) {
            layer.fire('load');
        }
    },

    _tileOnError: function(e) {
        var layer = this._layer;

        layer.fire('tileerror', {tile: this, url: this.src});

        var newUrl = layer.options.errorTileUrl;
        if (newUrl) {
            this.src = newUrl;
        }
    }
});
