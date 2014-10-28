(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Asset', AssetFactory);

    AssetFactory.$inject = ["G3ME", "Marker", "SQLite", "$rootScope", "Smartgeo", "$http", "Storage", "Site", "GPS"];


    function AssetFactory(G3ME, Marker, SQLite, $rootScope, Smartgeo, $http, Storage, Site, GPS) {

        /**
         * @class AssetFactory
         * @desc Factory de la classe Asset
         *
         * @property {Boolean} onMap L'objet est il affiché sur la carte ?
         * @property {L.Marker} consultationMarker Marker de consultation (Leaflet)
         */
        function Asset(asset, callback) {
            var self = this;
            if (typeof asset === "object") {
                angular.extend(this, asset);
            } else {
                Asset.findOne(asset, function (asset) {
                    angular.extend(self, asset);
                    (callback || angular.noop)();
                });
            }
        }

        Asset.prototype.onMap = false;
        Asset.prototype.consultationMarker = false;

        /**
         * @name showOnMap
         * @desc Montre l'objet sur la carte avec un marqueur
         */
        Asset.prototype.showOnMap = function () {
            var self = this;
            this.onMap = true;
            this.consultationMarker = this.consultationMarker || Marker.getMarkerFromAsset(this, function () {
                self.zoomOn();
            });
            if (G3ME.map) {
                this.consultationMarker.addTo(G3ME.map);
            }
        };

        /**
         * @name hideFromMap
         * @desc Cache l'objet de la carte
         */
        Asset.prototype.hideFromMap = function () {
            this.onMap = false;
            if (G3ME.map) {
                G3ME.map.removeLayer(this.consultationMarker);
            }
        };

        /**
         * @name toggleMapVisibility
         * @desc Change la visibilité de l'objet sur la carte
         */
        Asset.prototype.toggleMapVisibility = function () {
            this[this.onMap ? "hideFromMap" : "showOnMap"]();
        };

        /**
         * @name zoomOn
         * @desc Zoom sur l'objet
         */
        Asset.prototype.zoomOn = function () {
            G3ME.map.setView(this.getCenter(), 18);
            $rootScope.stopPosition();
        };

        /**
         * @name fetchHistory
         * @desc Recherche l'historique de maintenance sur le server
         */
        Asset.prototype.fetchHistory = function () {
            var self = this;
            $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.history', {
                id: this.guid,
                limit: 5
            })).success(function (data) {
                self.reports = data;
            }).error(function (error) {
                self.reports = [];
                console.error(error);
            });
        };

        /**
         * @name goTo
         * @desc Lance le GPS pour se rendre jusqu'à l'objet
         */
        Asset.prototype.goTo = function () {
            var center = this.getCenter();
            GPS.getCurrentLocation(function (lng, lat) {
                if (window.SmartgeoChromium && window.SmartgeoChromium.goTo) {
                    SmartgeoChromium.goTo(lng, lat, center[1], center[0]);
                } else if (window.cordova) {
                    cordova.exec(null, angular.noop, "gotoPlugin", "goto", [lat, lng, center[1], center[0]]);
                }
            });
        };

        /**
         * @name getCenter
         * @desc Retourne le centre d'un objet
         */
        Asset.prototype.getCenter = function () {
            var coordinates = this.geometry.coordinates;

            if (this.geometry.type === "Point") {
                return [coordinates[1], coordinates[0]];
            } else {
                return Asset.getLineStringMiddle(coordinates);
            }
        };

        /**
         * @name addToMission
         * @desc Ajoute l'objet à une mission
         * @param {Object} mission
         */
        Asset.prototype.addToMission = function (mission, e) {
            if (e) {
                e.preventDefault();
            }
            $rootScope.addAssetToMission(this, mission);
        };

        /**
         * @name getLineStringMiddle
         * @desc Retourne le milieu d'un LineString
         * @param {Array[]} coordinates Géometrie de l'objet
         */
        Asset.getLineStringMiddle = function (coordinates) {
            var length = 0,
                a, b, i, raptor, middle;
            for (i = 0; i < coordinates.length - 1; i++) {
                a = coordinates[i];
                b = coordinates[i + 1];
                a[2] = length;
                length += Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)); //TODO(@gulian): Factory Geometry ? Vector ?
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
         * @desc Cherche un objet en fonction de son identifiant
         * @param {Number} id
         * @param {Function} callback
         * @param {Array} zones
         */
        Asset.findOne = function (id, callback, zones) {

            if (!(zones = zones || Site.current.zones).length) {
                return callback(null);
            }

            SQLite.exec(zones[0].database_name, 'SELECT * FROM ASSETS WHERE id = ' + id, [], function (rows) {
                if (!rows.length) {
                    return Asset.findOne(id, callback, zones.slice(1));
                }
                callback(Asset.convertRawRow(rows.item(0)));
            });

        };

        /**
         * @name findInBounds
         * @desc Cherche
         * @param {Function} callback
         */
        Asset.findInBounds = function (center, bounds, callback) {

            var nw = bounds.getNorthWest(),
                se = bounds.getSouthEast(),
                zone,
                zoom = G3ME.map.getZoom(),
                request = " SELECT id, asset, label, geometry,";
            request += " CASE WHEN geometry LIKE '%Point%' THEN 1 WHEN geometry LIKE '%LineString%' THEN 2 END AS priority ";
            request += " FROM ASSETS WHERE NOT ( xmax < ? OR xmin > ? OR ymax < ? OR ymin > ?) ";
            request += " AND ( (minzoom <= 1*? OR minzoom = 'null') AND ( maxzoom >= 1*? OR maxzoom = 'null') )";

            for (var i = 0, length_ = Site.current.zones.length; i < length_; i++) {
                if (G3ME.extents_match(Site.current.zones[i].extent, {
                    xmin: nw.lng,
                    ymin: se.lng,
                    xmax: se.lat,
                    ymax: nw.lat
                })) {
                    zone = Site.current.zones[i];
                    break;
                }
            }

            if (!zone || (G3ME.active_layers && !G3ME.active_layers.length)) {
                return callback([]);
            } else if (G3ME.active_layers) {
                request += ' and (symbolId REGEXP "^(' + G3ME.active_layers.join('|') + ')[0-9]+" )';
            }
            request += " order by priority LIMIT 0,100 ";

            SQLite.exec(zone.database_name, request, [nw.lng, se.lng, se.lat, nw.lat, zoom, zoom], function (results) {
                var assets = [];
                for (var i = 0, numRows = results.length; i < numRows && assets.length < 10; i++) {
                    var asset = new Asset(Asset.convertRawRow(results.item(i)));
                    if (asset.geometry.type === "LineString") {
                        var p1 = G3ME.map.latLngToContainerPoint([center.lng, center.lat]),
                            p2, p3, distanceToCenter;
                        for (var j = 0, length_ = asset.geometry.coordinates.length; j < (length_ - 1); j++) {
                            p2 = j ? p3 : G3ME.map.latLngToContainerPoint(asset.geometry.coordinates[j]);
                            p3 = G3ME.map.latLngToContainerPoint(asset.geometry.coordinates[j + 1]);
                            distanceToCenter = L.LineUtil.pointToSegmentDistance(p1, p2, p3);
                            if (distanceToCenter <= 40) {
                                assets.push(asset);
                                break;
                            }
                        }
                    } else {
                        assets.push(asset);
                    }
                }
                return callback(assets);
            });
        };

        /**
         * @name convertRawRow
         * @desc Converti un objet sortant de la base de données en objet exploitable
         * @param {Object} asset
         */
        Asset.convertRawRow = function (asset) {
            var a = angular.copy(asset),
                parsed = JSON.parse(a.asset.replace(/&#039;/g, "'").replace(/\\\\/g, "\\"));
            return angular.extend(a, {
                okey: parsed.okey,
                attributes: parsed.attributes,
                guid: a.id, //TODO(@gulian): Utiliser asset.id dans l'application pour eviter cette ligne
                geometry: JSON.parse(a.geometry),
                asset: undefined,
                label: a.label.replace(/&#039;/g, "'").replace(/\\\\/g, "\\")
            });
        };

        return Asset;
    }

})();
