if (navigator.userAgent.match(/Android/i)) {
    L.TileLayer.FileCache = L.TileLayer.extend({
        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            this._adjustTilePoint(tilePoint);

            var this_ = this,
                z = tilePoint.z,
                x = tilePoint.x,
                y = tilePoint.y,
                callback_id = "15|" + z + "|" + x + "|" + y ;

            /*tile.onerror = function(event) {
                this_._tileOnError.call(this);
                delete ChromiumCallbacks[callback_id];
                tile.onerror = tile.onload = null;
            }

            tile.onload = function() {
                this_._tileOnLoad.call(this);
                delete ChromiumCallbacks[callback_id];
                tile.onerror = tile.onload = null;
            }

            ChromiumCallbacks[callback_id] = function(path) {
                if (1 * path === path || !path) {
                    tile.onerror();
                    return console.error(path);
                }
                tile.src = path;
            };*/
        }
    });
}