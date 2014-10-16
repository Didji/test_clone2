(function(){

    'use strict';

    angular
        .module('smartgeomobile')
        .controller( 'CensusController', CensusController );

    /**
     * @class CensusController
     * @desc Controlleur du menu de recensement
     *
     * @property {String} classindex Okey de l'objet recencé en cours
     */
    function CensusController() {

        var vm = this;

        vm.startCensus = startCensus;
        vm.cancel = cancel;
        vm.symbology = window.SMARTGEO_CURRENT_SITE.symbology;
        vm.dependancies = window.SMARTGEO_CURRENT_SITE.dependancies;
        vm.metamodel =  window.SMARTGEO_CURRENT_SITE.metamodel;

        vm.classindex = "" ;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate(){
            vm.classindex  = "0";
        }

        /**
         * @name startCensus
         * @desc Initialise un recensement avec un objet correspondant à l'okey passé en parametre
         * @param {String} okey Okey de l'objet à recenser
         */
        function startCensus(okey){
            vm.okey = okey ;
        }

        /**
         * @name cancel
         * @desc Annule le recensement en cours
         */
        function cancel(){
            vm.okey = null;
        }

    }

})();
