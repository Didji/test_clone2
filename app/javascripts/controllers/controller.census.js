(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'CensusController', CensusController );

    CensusController.$inject = ["Site", "Project"];

    /**
     * @class CensusController
     * @desc Controlleur du menu de recensement
     *
     * @property {String} classindex Okey de l'objet recencé en cours
     */
    function CensusController(Site, Project) {

        var vm = this;

        vm.startCensus = startCensus;
        vm.cancel = cancel;
        vm.projectFilter = projectFilter;

        vm.symbology = Site.current.symbology;
        vm.dependancies = Site.current.dependancies;
        vm.metamodel = Site.current.metamodel;

        vm.classindex = "";

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            vm.classindex = "0";
        }

        /**
         * @name startCensus
         * @desc Initialise un recensement avec un objet correspondant à l'okey passé en parametre
         * @param {String} okey Okey de l'objet à recenser
         */
        function startCensus(okey) {
            vm.okey = okey;
        }

        /**
         * @name cancel
         * @desc Annule le recensement en cours
         */
        function cancel() {
            vm.okey = null;
        }

        /**
         * @name projectFilter
         * @desc
         */
        function projectFilter() {
            console.log( arguments );
            // Project.currentLoadedProject
        }

    }

})();
