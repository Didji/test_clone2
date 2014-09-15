(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Asset', AssetFactory);

    AssetFactory.$inject = ["G3ME", "Icon", "Marker", "SQLite", "$rootScope", "Smartgeo", "$http", "Site"];


    function AssetFactory(G3ME, Icon, Marker, SQLite, $rootScope, Smartgeo, $http, Site) {

        /**
         * @class AssetFactory
         * @desc Factory de la classe Asset
         *
         * @property {Boolean} onMap L'objet est il affiché sur la carte ?
         * @property {L.Marker} consultationMarker Marker de consultation (Leaflet)
         */
        function Asset(asset, callback) {
            var self = this ;
            if(typeof asset === "object"){
                angular.extend(this, asset);
            } else {
                Asset.findOne(asset, function(asset){
                    angular.extend(self, asset);
                    (callback || angular.noop)();
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
            if(G3ME.map){
                this.consultationMarker.addTo(G3ME.map);
            }
        };

        /**
         * @name hideFromMap
         * @desc
         */
         Asset.prototype.hideFromMap = function() {
            this.onMap = false;
            if(G3ME.map){
                G3ME.map.removeLayer(this.consultationMarker);
            }
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
         * @name fetchHistory
         * @desc
         */
        Asset.prototype.fetchHistory = function(){
            var self = this ;
            $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.history', {
                id : this.guid,
                limit: 5
            })).success(function(data){
                self.reports = data ;
            }).error(function(error){
                self.reports = [] ;
                console.error(error);
            });
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
            var coordinates = this.geometry.coordinates;

            if(this.geometry.type === "Point"){
                return [coordinates[1], coordinates[0]];
            } else {
                return Asset.getLineStringMiddle(coordinates);
            }
        };

        /**
         * @name addToMission
         * @desc
         * @param {Object} mission
         */
        Asset.prototype.addToMission = function(mission) {
            $rootScope.addAssetToMission(this, mission);
        }

        /**
         * @name getLineStringMiddle
         * @desc Retourne le milieu d'un LineString
         * @param {Array[]} coordinates Géometrie de l'objet
         */
        Asset.getLineStringMiddle = function (coordinates) {
            var length = 0, a, b, i, raptor , middle ;
            for (i = 0; i < coordinates.length - 1; i++) {
                a = coordinates[i];
                b = coordinates[i + 1];
                a[2] = length;
                length += Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));   //TODO(@gulian): Factory Geometry ? Vector ?
            }
            coordinates[coordinates.length - 1][2] = length;
            middle = length / 2;
            for (i = 0; i < coordinates.length - 1; i++) {
                a = coordinates[i];
                b = coordinates[i + 1];
                if (a[2] <= middle && middle <= b[2]) {
                    raptor = (middle - a[2]) / (b[2] - a[2]);
                    return [a[1] + raptor * (b[1] - a[1]), a[0] + raptor * (b[0] - a[0]), a];
                }
            }
        };

        /**
         * @name findOne
         * @desc
         */
        Asset.findOne = function(id, callback, zones){

            if (!(zones = zones || Site.current().zones).length) {
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
            var a = angular.copy(asset) , parsed = JSON.parse(a.asset.replace(/&#039;/g, "'").replace(/\\\\/g, "\\")) ;
            return angular.extend(a, {
                okey        : parsed.okey,
                attributes  : parsed.attributes,
                guid        : a.id,                     //TODO(@gulian): Utiliser asset.id dans l'application pour eviter cette ligne
                geometry    : JSON.parse(a.geometry),
                asset       : undefined,
                label       : a.label.replace(/&#039;/g, "'").replace(/\\\\/g, "\\")
            });
        };

        return Asset;
    }

})();
