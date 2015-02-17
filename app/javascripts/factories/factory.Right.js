(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Right', RightFactory );

    RightFactory.$inject = [];


    function RightFactory() {

        /**
         * @class RightFactory
         * @desc Factory de la classe Right
         */

        var Right = {};

        /**
         * @name isUpdatable
         * @desc Retourne un droit
         * @param {String} right Nom du droit
         */
        Right.isUpdatable = function(asset) {
            return (asset.attributes._rights === "U");
        };

        /**
         * @name isReadOnly
         * @desc Retourne un droit
         * @param {String} right Nom du droit
         */
        Right.isReadOnly = function(asset) {
            return (asset.attributes._rights === "RO");
        };

        /**
         * @name get
         * @desc Retourne un droit
         * @param {String} right Nom du droit
         */
        Right.get = function(right) {
            return Right.values[right];
        };

        /**
         * @name get
         * @desc Enregistre un droit
         * @param {String} right Nom du droit
         * @param {Boolean} value Valeur du droit
         */
        Right.set = function(right, value) {
            Right.values[right] = value ;
        };

        Right.values = {
            census: true,
            consultation: true,
            search: true,
            logout: true,
            report: true,
            parameters: true,
            planning: true,
            history: true,
            photo: true,
            project: true,
            media: true,
            myposition: true,
            activelayers: true,
            goto: true,
            synccenter: true,
            siteselection: true,
            _DONT_REALLY_RESET: false
        };

        return Right;
    }

})();
