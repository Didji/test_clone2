(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( '<%= controllerName %>Controller', <%= controllerName %>Controller );

    <%= controllerName %>Controller.$inject = [<%= quotedDependancies %>];

    /**
     * @class <%= controllerName %>Controller
     * @desc
     * @property
     */
    function <%= controllerName %>Controller(<%= dependancies %>) {

        var vm = this;

        vm.viewModelFunction = viewModelFunction;

        vm.viewModelAttribute = "viewModelAttribute";

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
        }

        /**
         * @name viewModelFunction
         * @desc
         * @param
         * @returns
         */
        function viewModelFunction() {
        }

        /**
         * @name viewModelFunction
         * @desc
         * @param
         * @returns
         */
        function nonViewModelFunction() {
        }


    }

})();
