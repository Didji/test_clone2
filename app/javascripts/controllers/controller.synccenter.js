(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'SyncCenterController', SyncCenterController );

    SyncCenterController.$inject = ["$rootScope", "Synchronizator"];

    /**
     * @class SyncCenterController
     * @desc Controlleur du menu de gestion des parametres
     */
    function SyncCenterController($rootScope, Synchronizator) {

        var vm = this;

        // vm.activities = Site.current.activities;
        // vm.metamodel = Site.current.metamodel;

        // var synchronizationCheckTimeout = 1000 * 60 * 10,
        //     synchronizationTimeout = 1000 * 60 * 5,
        //     reportsSynchronizationCheckTimeoutId = false,
        //     reportsSynchronizationTimeoutId = false,
        //     assetsSynchronizationTimeoutId = false;

        vm.synchronize = synchronize ;
        vm.deleteItem = deleteItem ;

        vm.syncItems = [];

        $rootScope.$on( 'synchronizator_update', activate );

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            Synchronizator.listItems( function(syncItems) {
                Synchronizator.syncItems( vm.syncItems = syncItems );
            } );
        }

        /**
         * @name synchronize
         * @desc Synchronize un item en particulier
         */
        function synchronize(item) {
            Synchronizator.syncItems( item );
        }

        /**
         * @name deleteItem
         * @desc Supprime un item en particulier
         */
        function deleteItem(item) {
            Synchronizator.deleteItem( item );
        }

    }

})();



