angular.module('smartgeomobile').factory('AssetFactory', function ($http, Smartgeo, $q, $rootScope, Installer) {

    'use strict';

    /**
     * @class AssetError
     */
    function AssetError(message) {
        this.name = "AssetError";
        this.message = message || "Unhandled AssetError";
    }
    AssetError.prototype = new Error();
    AssetError.prototype.constructor = AssetError;


    /**
     * @class Asset
     */
    var Asset = function(asset){
        return this;
    };

    /**
     * @method
     * @memberOf Asset
     */
    Asset.save = function(asset) {
        console.log(asset);
        console.log(Installer.build_binded_insert_request($rootScope.site, [asset]));
    };

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__log = function() { }

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__clone = function() {}

    /**
     * @method
     * @memberOf Asset
     * @private
     */
    Asset.prototype.__clean = function() {}

    return Asset;
});
