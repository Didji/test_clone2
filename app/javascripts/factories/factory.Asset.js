(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Asset', AssetFactory);

    AssetFactory.$inject = ["G3ME", "Icon", "Marker"];

    /**
     * @class AssetFactory
     * @desc Factory de la classe Asset
     *
     * @property {Boolean} onMap L'objet est il affiché sur la carte ?
     */

    function AssetFactory(G3ME, Icon, Marker) {

        function Asset(asset) {
            angular.extend(this, asset);
        }

        Asset.prototype.onMap = false;
        Asset.prototype.consultationMarker = false;

        Asset.prototype.showOnMap = function() {
            this.onMap = true;
            this.consultationMarker = this.consultationMarker || Marker.getMarkerFromAsset(this);
            this.consultationMarker.addTo(G3ME.map);
        }

        Asset.prototype.hideFromMap = function() {
            this.onMap = false;
            G3ME.map.removeLayer(this.consultationMarker);
        }

        Asset.prototype.toggleMapVisibility = function() {
            this[this.onMap ? "hideFromMap" : "showOnMap"]();
        }

        return Asset;
    }

})();