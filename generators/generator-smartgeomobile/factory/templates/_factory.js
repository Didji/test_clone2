(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( '<%= factoryName %>', <%= factoryName %>Factory );

    <%= factoryName %>Factory.$inject = [<%= quotedDependancies %>];

    function <%= factoryName %>Factory(<%= dependancies %>) {

        /**s
         * @class <%= factoryName %>Factory
         * @desc Factory de la classe <%= factoryName %>
         */
        var <%= factoryName %> = {};

        /**
         * @name functionName
         * @param {type} name desc
         * @returns {type} desc
         * @desc desc
         */
        <%= factoryName %>.functionName = function() {

        };

        return <%= factoryName %>;
    }

})();
