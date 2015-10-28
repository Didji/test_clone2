L.TileLayer.FileCache = L.TileLayer.extend( {
    initialize: function(url, options) {
        options = L.setOptions( this, options );

        // detecting retina displays, adjusting tileSize and zoom levels
        if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {

            options.tileSize = Math.floor( options.tileSize / 2 );
            options.zoomOffset++;

            if (options.minZoom > 0) {
                options.minZoom--;
            }
            this.options.maxZoom--;
        }

        if (options.bounds) {
            options.bounds = L.latLngBounds( options.bounds );
        }

        this._url = url;

        var subdomains = this.options.subdomains;

        if (typeof subdomains === 'string') {
            this.options.subdomains = subdomains.split( '' );
        }

        this.initFS();


    },

    onAdd: function(map) {
        this._map = map;
        this._animated = map._zoomAnimated;

        // create a container div for tiles
        this._initContainer();

        // set up events
        map.on( {
            'viewreset': this._reset,
            'moveend': this._update
        }, this );

        if (this._animated) {
            map.on( {
                'zoomanim': this._animateZoom,
                'zoomend': this._endZoomAnim
            }, this );
        }

        if (!this.options.updateWhenIdle) {
            this._limitedUpdate = L.Util.limitExecByInterval( this._update, 150, this );
            map.on( 'move', this._limitedUpdate, this );
        }

        this._reset();
        this._update();
    },

    addTo: function(map) {
        map.addLayer( this );
        return this;
    },

    onRemove: function(map) {
        this._container.parentNode.removeChild( this._container );

        map.off( {
            'viewreset': this._reset,
            'moveend': this._update
        }, this );

        if (this._animated) {
            map.off( {
                'zoomanim': this._animateZoom,
                'zoomend': this._endZoomAnim
            }, this );
        }

        if (!this.options.updateWhenIdle) {
            map.off( 'move', this._limitedUpdate, this );
        }

        this._container = null;
        this._map = null;
    },

    bringToFront: function() {
        var pane = this._map._panes.tilePane;

        if (this._container) {
            pane.appendChild( this._container );
            this._setAutoZIndex( pane, Math.max );
        }

        return this;
    },

    bringToBack: function() {
        var pane = this._map._panes.tilePane;

        if (this._container) {
            pane.insertBefore( this._container, pane.firstChild );
            this._setAutoZIndex( pane, Math.min );
        }

        return this;
    },

    getAttribution: function() {
        return this.options.attribution;
    },

    getContainer: function() {
        return this._container;
    },

    setOpacity: function(opacity) {
        this.options.opacity = opacity;

        if (this._map) {
            this._updateOpacity();
        }

        return this;
    },

    setZIndex: function(zIndex) {
        this.options.zIndex = zIndex;
        this._updateZIndex();

        return this;
    },

    setUrl: function(url, noRedraw) {
        this._url = url;

        if (!noRedraw) {
            this.redraw();
        }

        return this;
    },

    redraw: function() {
        if (this._map) {
            this._reset( {
                hard: true
            } );
            this._update();
        }
        return this;
    },

    _updateZIndex: function() {
        if (this._container && this.options.zIndex !== undefined) {
            this._container.style.zIndex = this.options.zIndex;
        }
    },

    _setAutoZIndex: function(pane, compare) {

        var layers = pane.children,
            edgeZIndex = -compare( Infinity, -Infinity ), // -Infinity for max, Infinity for min
            zIndex, i, len;

        for (i = 0, len = layers.length; i < len; i++) {

            if (layers[i] !== this._container) {
                zIndex = parseInt( layers[i].style.zIndex, 10 );

                if (!isNaN( zIndex )) {
                    edgeZIndex = compare( edgeZIndex, zIndex );
                }
            }
        }

        this.options.zIndex = this._container.style.zIndex = (isFinite( edgeZIndex ) ? edgeZIndex : 0) + compare( 1, -1 );
    },

    _updateOpacity: function() {
        var i,
            tiles = this._tiles;

        if (L.Browser.ielt9) {
            for (i in tiles) {
                L.DomUtil.setOpacity( tiles[i], this.options.opacity );
            }
        } else {
            L.DomUtil.setOpacity( this._container, this.options.opacity );
        }
    },

    _initContainer: function() {
        var tilePane = this._map._panes.tilePane;

        if (!this._container) {
            this._container = L.DomUtil.create( 'div', 'leaflet-layer' );

            this._updateZIndex();

            if (this._animated) {
                var className = 'leaflet-tile-container leaflet-zoom-animated';

                this._bgBuffer = L.DomUtil.create( 'div', className, this._container );
                this._tileContainer = L.DomUtil.create( 'div', className, this._container );

            } else {
                this._tileContainer = this._container;
            }

            tilePane.appendChild( this._container );

            if (this.options.opacity < 1) {
                this._updateOpacity();
            }
        }
    },

    _reset: function(e) {
        for (var key in this._tiles) {
            this.fire( 'tileunload', {
                tile: this._tiles[key]
            } );
        }

        this._tiles = {};
        this._tilesToLoad = 0;

        if (this.options.reuseTiles) {
            this._unusedTiles = [];
        }

        this._tileContainer.innerHTML = '';

        if (this._animated && e && e.hard) {
            this._clearBgBuffer();
        }

        this._initContainer();
    },

    _getTileSize: function() {
        var map = this._map,
            zoom = map.getZoom(),
            zoomN = this.options.maxNativeZoom,
            tileSize = this.options.tileSize;

        if (zoomN && zoom > zoomN) {
            tileSize = Math.round( map.getZoomScale( zoom ) / map.getZoomScale( zoomN ) * tileSize );
        }

        return tileSize;
    },

    _update: function() {

        if (!this._map) {
            return;
        }

        var map = this._map,
            bounds = map.getPixelBounds(),
            zoom = map.getZoom(),
            tileSize = this._getTileSize();

        if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
            return;
        }

        var tileBounds = L.bounds(
            bounds.min.divideBy( tileSize )._floor(),
            bounds.max.divideBy( tileSize )._floor() );

        this._addTilesFromCenterOut( tileBounds );

        if (this.options.unloadInvisibleTiles || this.options.reuseTiles) {
            this._removeOtherTiles( tileBounds );
        }
    },

    _addTilesFromCenterOut: function(bounds) {
        var queue = [],
            center = bounds.getCenter();

        var j, i, point;

        for (j = bounds.min.y; j <= bounds.max.y; j++) {
            for (i = bounds.min.x; i <= bounds.max.x; i++) {
                point = new L.Point( i, j );

                if (this._tileShouldBeLoaded( point )) {
                    queue.push( point );
                }
            }
        }

        var tilesToLoad = queue.length;

        if (tilesToLoad === 0) {
            return;
        }

        // load tiles in order of their distance to center
        queue.sort( function(a, b) {
            return a.distanceTo( center ) - b.distanceTo( center );
        } );

        var fragment = document.createDocumentFragment();

        // if its the first batch of tiles to load
        if (!this._tilesToLoad) {
            this.fire( 'loading' );
        }

        this._tilesToLoad += tilesToLoad;

        for (i = 0; i < tilesToLoad; i++) {
            this._addTile( queue[i], fragment );
        }

        this._tileContainer.appendChild( fragment );
    },

    _tileShouldBeLoaded: function(tilePoint) {
        if ((tilePoint.x + ':' + tilePoint.y) in this._tiles) {
            return false; // already loaded
        }

        var options = this.options;

        if (!options.continuousWorld) {
            var limit = this._getWrapTileNum();

            // don't load if exceeds world bounds
            if ((options.noWrap && (tilePoint.x < 0 || tilePoint.x >= limit)) ||
                tilePoint.y < 0 || tilePoint.y >= limit) {
                return false;
            }
        }

        if (options.bounds) {
            var tileSize = options.tileSize,
                nwPoint = tilePoint.multiplyBy( tileSize ),
                sePoint = nwPoint.add( [tileSize, tileSize] ),
                nw = this._map.unproject( nwPoint ),
                se = this._map.unproject( sePoint );

            // TODO temporary hack, will be removed after refactoring projections
            // https://github.com/Leaflet/Leaflet/issues/1618
            if (!options.continuousWorld && !options.noWrap) {
                nw = nw.wrap();
                se = se.wrap();
            }

            if (!options.bounds.intersects( [nw, se] )) {
                return false;
            }
        }

        return true;
    },

    _removeOtherTiles: function(bounds) {
        var kArr, x, y, key;

        for (key in this._tiles) {
            kArr = key.split( ':' );
            x = parseInt( kArr[0], 10 );
            y = parseInt( kArr[1], 10 );

            // remove tile if it's out of bounds
            if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
                this._removeTile( key );
            }
        }
    },

    _removeTile: function(key) {
        var tile = this._tiles[key];

        this.fire( 'tileunload', {
            tile: tile,
            url: tile.src
        } );

        if (this.options.reuseTiles) {
            L.DomUtil.removeClass( tile, 'leaflet-tile-loaded' );
            this._unusedTiles.push( tile );

        } else if (tile.parentNode === this._tileContainer) {
            this._tileContainer.removeChild( tile );
        }

        // for https://github.com/CloudMade/Leaflet/issues/137
        if (!L.Browser.android) {
            tile.onload = null;
            tile.src = L.Util.emptyImageUrl;
        }

        delete this._tiles[key];
    },

    _addTile: function(tilePoint, container) {
        var tilePos = this._getTilePos( tilePoint );

        // get unused tile - or create a new tile
        var tile = this._getTile(),
            zoom = this._map.getZoom();
        /*
    Chrome 20 layouts much faster with top/left (verify with timeline, frames)
    Android 4 browser has display issues with top/left and requires transform instead
    Android 2 browser requires top/left or tiles disappear on load or first drag
    (reappear after zoom) https://github.com/CloudMade/Leaflet/issues/866
    (other browsers don't currently care) - see debug/hacks/jitter.html for an example
    */
        L.DomUtil.setPosition( tile, tilePos, L.Browser.chrome || L.Browser.android23 );

        this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;

        this._loadTile( tile, tilePoint );
        if (tile.parentNode !== this._tileContainer) {
            container.appendChild( tile );
        }
    },

    _getZoomForUrl: function() {

        var options = this.options,
            zoom = this._map.getZoom();

        if (options.zoomReverse) {
            zoom = options.maxZoom - zoom;
        }

        zoom += options.zoomOffset;

        return options.maxNativeZoom ? Math.min( zoom, options.maxNativeZoom ) : zoom;
    },

    _getTilePos: function(tilePoint) {
        var origin = this._map.getPixelOrigin(),
            tileSize = this._getTileSize();

        return tilePoint.multiplyBy( tileSize ).subtract( origin );
    },

    // image-specific code (override to implement e.g. Canvas or SVG tile layer)

    getTileUrl: function(tilePoint, zoom) {
        return L.Util.template( this._url, L.extend( {
            s: this._getSubdomain( tilePoint ),
            z: zoom,
            x: tilePoint.x,
            y: tilePoint.y
        }, this.options ) );
    },

    _getWrapTileNum: function() {
        // TODO refactor, limit is not valid for non-standard projections
        return Math.pow( 2, this._getZoomForUrl() );
    },

    _adjustTilePoint: function(tilePoint) {

        var limit = this._getWrapTileNum();

        // wrap tile coordinates
        if (!this.options.continuousWorld && !this.options.noWrap) {
            tilePoint.x = ((tilePoint.x % limit) + limit) % limit;
        }

        if (this.options.tms) {
            tilePoint.y = limit - tilePoint.y - 1;
        }

        tilePoint.z = this._getZoomForUrl();
    },

    _getSubdomain: function(tilePoint) {
        var index = Math.abs( tilePoint.x + tilePoint.y ) % this.options.subdomains.length;
        return this.options.subdomains[index];
    },

    _getTile: function() {
        if (this.options.reuseTiles && this._unusedTiles.length > 0) {
            var tile = this._unusedTiles.pop();
            this._resetTile( tile );
            return tile;
        }
        return this._createTile();
    },

    // Override if data stored on a tile needs to be cleaned up before reuse
    _resetTile: function( /*tile*/ ) {},

    _createTile: function() {
        var tile = L.DomUtil.create( 'img', 'leaflet-tile' );
        tile.style.width = tile.style.height = this._getTileSize() + 'px';
        tile.galleryimg = 'no';

        tile.onselectstart = tile.onmousemove = L.Util.falseFn;

        if (L.Browser.ielt9 && this.options.opacity !== undefined) {
            L.DomUtil.setOpacity( tile, this.options.opacity );
        }
        return tile;
    },

    _loadTile: function(tile, tilePoint, zoom) {
        tile._layer = this;
        tile.onload = this._tileOnLoad;
        tile.onerror = this._tileOnError;

        this._adjustTilePoint( tilePoint );
        // remplace fetchTileFromCache
        this.fetchTileFromDB( tile, tilePoint.z, tilePoint.x, tilePoint.y );
    },

    _tileLoaded: function() {
        this._tilesToLoad--;
        if (!this._tilesToLoad) {
            this.fire( 'load' );

            if (this._animated) {
                // clear scaled tiles after all new tiles are loaded (for performance)
                clearTimeout( this._clearBgBufferTimer );
                this._clearBgBufferTimer = setTimeout( L.bind( this._clearBgBuffer, this ), 500 );
            }
        }
    },

    _tileOnLoad: function() {
        var layer = this._layer;

        //Only if we are loading an actual image
        if (this.src !== L.Util.emptyImageUrl) {
            L.DomUtil.addClass( this, 'leaflet-tile-loaded' );

            layer.fire( 'tileload', {
                tile: this,
                url: this.src
            } );
        }

        layer._tileLoaded();
    },

    _tileOnError: function() {
        var layer = this._layer;

        layer.fire( 'tileerror', {
            tile: this,
            url: this.src
        } );

        var newUrl = layer.options.errorTileUrl;
        if (newUrl) {
            this.src = newUrl;
        }

        layer._tileLoaded();
    },


    initFS: function(grantedBytes) {
        grantedBytes = grantedBytes || 100 * 1024 * 1024;
        var this_ = this;

        this.requestQuota( function() {
            if (window.requestFileSystem || window.webkitRequestFileSystem) {
                (window.requestFileSystem || window.webkitRequestFileSystem)( window.PERSISTENT, grantedBytes, function(fs) {
                    this_.filesystem = fs;
                }, this_.log_fs_error );
            } else {
                this_.filesystem = true;
            }
        } );
    },

    log_fs_error: function(e) {
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
        console.error( 'Error: ' + msg );
    },

    requestQuota: function(callback) {
        window.requestFileSystem;
        if (navigator.webkitPersistentStorage) {
            navigator.webkitPersistentStorage.requestQuota( 1024 * 1024 * 500, callback );
        } else if (window.storageInfo) {
            window.storageInfo.requestQuota( window.PERSISTENT, 0, callback );
        } else {
            console.error( "no filesystem found" );
            callback();
        }
    },

    getTilePath: function(tile) {
        return 'tiles/' + tile.z; //+'/'+tile.x ;
    },

    createDirectory: function(path, callback, step) {
        step = step || 1;

        if (step > path.length)
            return callback();

        var this_ = this;

        this.filesystem.root.getDirectory( path.split( '/' ).slice( 0, step ).join( '/' ), {
            create: true
        }, function(dirEntry) {
                this_.createDirectory( path, callback, ++step );
            }, this_.log_fs_error );

    },

    writeTileToDB: function(tileObject, dataUrl, callback) {
        var db_name = "g3tiles-" + ( tileObject.y % 10 );

        if (device.platform == "iOS") {
            // version pour ios seulement, le reste n'est pas dépendant d'ios
            //  location: 0 (default): Documents - visible to iTunes and backed up by iCloud
            //            1 Library - backed up by iCloud, NOT visible to iTunes
            //            2 Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
            var db = sqlitePlugin.openDatabase({name: db_name, location: 2});
        }
        else {
            var db = sqlitePlugin.openDatabase({name: db_name});
        }

        // Création de la db, avec les bonnes tables et activation de la persistence journal
        // Insertion de la tuile dans la bonne db.
        // Il manque l'écriture des metadata et le lien avec les tuiles existantes.

        db.transaction(function(tx) {
            tx.executeSql("CREATE TABLE IF NOT EXISTS tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);");
            tx.executeSql("CREATE UNIQUE INDEX IF NOT EXISTS trinom ON tiles(zoom_level, tile_column, tile_row);");
            tx.executeSql("PRAGMA journal_mode = PERSIST;");

            if (device.platform == "Android") {
                tx.executeSql("CREATE TABLE IF NOT EXISTS android_metadata (locale TEXT);");
                tx.executeSql("INSERT OR IGNORE INTO android_metadata VALUES (?);", ['fr_FR']);
            }
            else if (device.platform == "iOS") {
                tx.executeSql("CREATE TABLE IF NOT EXISTS ios_metadata (locale TEXT);");
                tx.executeSql("INSERT OR IGNORE INTO ios_metadata VALUES (?);", ['fr_FR']);
            }
            tx.executeSql("INSERT OR IGNORE INTO tiles VALUES (?, ?, ?, ?);", [tileObject.z, tileObject.x, tileObject.y, dataUrl]);
        });
    },

    getDataURL: function(img) {
        img.crossOrigin = "anonymous";
        var canvas = document.createElement( "canvas" );
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext( "2d" );
        ctx.drawImage( img, 0, 0 );
        return canvas.toDataURL("image/png").substr(22);
    },

    // Reprise de fetchTileFromCache pour utiliser les db sqlite
    // Il faudrait ajouter un script de déplacement des anciennes db vers
    // le dossier ou se trouve les nouvelles db, à ajouter au script d'installation
    // ou lors de la connexion.

    fetchTileFromDB: function(image, z, x, y) {
        var this_ = this;

        var tileObject = {
            image: image,
            provider: this.id,
            x: x,
            y: y,
            z: z,
            src: null,
            tiles: this
        };

        var db_name = "g3tiles-" + ( y % 10 );
        
        if (device.platform == "iOS") {
            // version pour ios seulement, le reste n'est pas dépendant d'ios
            //  location: 0 (default): Documents - visible to iTunes and backed up by iCloud
            //            1 Library - backed up by iCloud, NOT visible to iTunes
            //            2 Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
            var db = sqlitePlugin.openDatabase({name: db_name, location: 2});
        }
        else {
            var db = sqlitePlugin.openDatabase({name: db_name});
        }

        var oldTile = image.src;

        db.transaction(function(tx) {
            tx.executeSql("SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?", [z, x, y], function(tx, result) {
                // Si la requete a fonctionnée
                if(result.rows.length == 0) {
                    // Mais qu'il n'y a pas cette tuile dans la db
                    // récupération de la tuile
                    // écriture en db
                    image.src = this_.getTileUrl( {
                        x: x,
                        y: y
                    }, z );
                    image.onerror = function(event) {
                        this_._tileOnError.call( this );
                        image.src = oldTile;
                        image.onerror = image.onload = null;
                    };
                    image.onload = function() {
                        this_._tileOnLoad.call( this );
                        this_.writeTileToDB( tileObject, this_.getDataURL(image));
                        image.onerror = image.onload = null;
                    };
                }
                else {
                    // Et que la tuile existe dans la db
                    // pas d'écriture en db
                    // pas d'appel distant
                    image.src = "data:image/png;base64," + result.rows.item(0).tile_data;

                    image.onerror = function(event) {
                        this_._tileOnError.call( this );
                        image.src = oldTile;
                        image.onerror = image.onload = null;
                    };
                    image.onload = function() {
                        this_._tileOnLoad.call( this );
                        image.onerror = image.onload = null;
                    }
                }
            }, function(tx, err){
                // Si la requête échoue, parce que la table tiles n'existe pas ou autre, etc...
                // récupération de la tuile
                // écriture en db
                image.src = this_.getTileUrl( {
                    x: x,
                    y: y
                }, z );
                image.onerror = function(event) {
                    this_._tileOnError.call( this );
                    image.src = oldTile;
                    image.onerror = image.onload = null;
                };
                image.onload = function() {
                    this_._tileOnLoad.call( this );
                    this_.writeTileToDB( tileObject, this_.getDataURL(image));
                    image.onerror = image.onload = null;
                };
            });
        });
    },

    readMetadataTileFile: function(tileObject, callback) {
        this.filesystem.root.getFile( this.getTilePath( tileObject ) + '/' + tileObject.x + '_' + tileObject.y + '.png.metadata', {
            create: true
        }, function(fileEntry) {
                fileEntry.file( function(file) {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                        var metadata;
                        try {
                            metadata = JSON.parse( reader.result || '{}' );
                            callback( metadata );
                        } catch ( e ) {
                            callback( {
                                etag: undefined
                            } );
                        }
                    };
                    reader.readAsText( file );
                } );
            } );
    },


    // La fonction écrit dans la db, mais comme je n'ai pas encore fait le lien
    // entre la db des tuiles et les metadata, ce n'est pas encore fonctionnel.

    writeMetadataTileFile: function(tileObject, metadata, callback) {
        var db_name = "g3tiles-" + ( tileObject.y % 10 );

        if (device.platform == "iOS") {
            // version pour ios seulement, le reste n'est pas dépendant d'ios
            //  location: 0 (default): Documents - visible to iTunes and backed up by iCloud
            //            1 Library - backed up by iCloud, NOT visible to iTunes
            //            2 Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
            var db = sqlitePlugin.openDatabase({name: db_name, location: 2});
        }
        else {
            var db = sqlitePlugin.openDatabase({name: db_name});
        }

        db.transaction(function(tx) {
            if (device.platform == "Android") {
                tx.executeSql("CREATE TABLE IF NOT EXISTS android_metadata (locale TEXT DEFAULT 'fr_FR');");
                tx.executeSql("INSERT OR IGNORE INTO android_metadata VALUES (?);", ['fr_FR']);
            }
            else if (device.platform == "iOS") {
                tx.executeSql("CREATE TABLE IF NOT EXISTS ios_metadata (locale TEXT DEFAULT 'fr_FR');");
                tx.executeSql("INSERT OR IGNORE INTO ios_metadata VALUES (?);", ['fr_FR']);
            }
        });

    },

    doINeedToReCacheThisTile: function(tileObject, file, callback) {
        var _this = this;
        this.readMetadataTileFile( tileObject, function(metadata) {
            // if (!metadata.etag) {
            //     callback(true);
            // } else {
            _this.getRemoteETag( tileObject, function(remoteETag) {
                if (metadata.etag != remoteETag && remoteETag !== null) {
                    callback( true );
                } else {
                    callback( false );
                }
            } );
            // }
        } );
    },

    getRemoteETag: function(tileObject, callback) {
        var http = new XMLHttpRequest(),
            url = this.getTileUrl( {
                x: tileObject.x,
                y: tileObject.y
            }, tileObject.z ),
            self = this;
        http.withCredentials = true;
        http.open( 'HEAD', url, true );
        http.onreadystatechange = function() {
            if (this.readyState == this.DONE && this.status === 200) {
                callback( this.getResponseHeader( "etag" ) );
            } else if (this.readyState == this.DONE && this.status === 403) {
                if (!window.SMARTGEO_CURRENT_SITE.EXTERNAL_TILEURL) {
                    //     for (var i in self._map._layers) {
                    //         self._map._layers[i].redraw && self._map._layers[i].redraw();
                    //     }
                    // });
                }
                callback( null );
            } else {
                callback( null );
            }

        };
        http.send();
    },

    convertDataURIToBinary: function(dataURI) {
        var BASE64_MARKER = ';base64,';
        var base64Index = dataURI.indexOf( BASE64_MARKER ) + BASE64_MARKER.length;
        var base64 = dataURI.substring( base64Index );
        var raw = window.atob( base64 );
        var rawLength = raw.length;
        var array = new Uint8Array( new ArrayBuffer( rawLength ) );

        for (i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt( i );
        }
        return new Blob(array, {type: 'image/png'});
    }

} );
