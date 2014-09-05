(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Asset', AssetFactory);

    AssetFactory.$inject = ["G3ME", "Icon", "Marker", "SQLite", "$rootScope", "Smartgeo"];

    /**
     * @class AssetFactory
     * @desc Factory de la classe Asset
     *
     * @property {Boolean} onMap L'objet est il affiché sur la carte ?
     * @property {L.Marker} consultationMarker Marker de consultation (Leaflet)
     */

    function AssetFactory(G3ME, Icon, Marker, SQLite, $rootScope, Smartgeo) {

        function Asset(asset, callback) {
            var self = this ;
            if(typeof asset === "object"){
                angular.extend(this, asset);
            } else {
                Asset.findOne(asset, function(asset){
                    angular.extend(self, asset);
                });
            }
        }

        Asset.prototype.onMap = false;
        Asset.prototype.consultationMarker = false;

        /**
         * @name showOnMap
         * @desc
         */
        Asset.prototype.showOnMap = function() {
            var self = this ;
            this.onMap = true;
            this.consultationMarker = this.consultationMarker || Marker.getMarkerFromAsset(this, function(){self.zoomOn()});
            this.consultationMarker.addTo(G3ME.map);
        };

        /**
         * @name hideFromMap
         * @desc
         */
         Asset.prototype.hideFromMap = function() {
            this.onMap = false;
            G3ME.map.removeLayer(this.consultationMarker);
        };

        /**
         * @name toggleMapVisibility
         * @desc
         */
        Asset.prototype.toggleMapVisibility = function() {
            this[this.onMap ? "hideFromMap" : "showOnMap"]();
        };

        /**
         * @name zoomOn
         * @desc
         */
        Asset.prototype.zoomOn = function(){
            G3ME.map.setView(this.getCenter(), 18);
        };

        /**
         * @name goTo
         * @desc
         */
        Asset.prototype.goTo = function(){
            var center = this.getCenter();
            Smartgeo.getCurrentLocation(function(lng, lat, alt, acc){
                if (window.SmartgeoChromium && window.SmartgeoChromium.goTo) {
                    SmartgeoChromium.goTo(lng, lat, center[0], center[1]);
                } else if(window.cordova){
                    cordova.exec(null, angular.noop, "gotoPlugin", "goto", [lat, lng, center[1], center[0]]);
                }
            });
        };

        /**
         * @name getCenter
         * @desc
         */
        Asset.prototype.getCenter  = function(){
            var coords = this.geometry.coordinates, center;
            switch (this.geometry.type) {
                case "Point":
                    center = [coords[1], coords[0]];
                    break;
                case "LineString":
                    center = [coords[0][1], coords[0][0]];
                    break;
                default:
                    center = [coords[0][0][1], coords[0][0][0]];
            }
            return center ;
        };

        /**
         * @name findOne
         * @desc
         */
        Asset.findOne = function(id, callback, zones){

            if (!(zones = zones || $rootScope.site.zones).length) {
                return callback(null);
            }

            SQLite.exec(zones[0].database_name, 'SELECT * FROM ASSETS WHERE id = ' + id, [], function(rows){
                if(!rows.length){
                    return Asset.findOne(id, callback, zones.slice(1));
                }
                callback(Asset.convertRawRow(rows.item(0)));
            });

        };

        /**
         * @name convertRawRow
         * @desc
         */
        Asset.convertRawRow = function(asset){
            var a = angular.copy(asset) , parsed = JSON.parse(a.asset) ;
            return angular.extend(a, {
                okey        : parsed.okey,
                attributes  : parsed.attributes,
                guid        : a.id,                     //TODO(@gulian): Utiliser asset.id dans l'application pour eviter cette ligne
                geometry    : JSON.parse(a.geometry),
                asset       : undefined
            });
        };

        return Asset;
    }

})();