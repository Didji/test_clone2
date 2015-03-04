(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'SyncCenterController', SyncCenterController );

    SyncCenterController.$inject = ["$scope", "$rootScope", "Synchronizator"];

    /**
     * @class SyncCenterController
     * @desc Controlleur du menu de gestion des parametres
     */
    function SyncCenterController($scope, $rootScope, Synchronizator) {

        var vm = this;

        vm.synchronize = synchronize ;
        vm.synchronizeAll = synchronizeAll ;
        vm.updateList = updateList ;
        vm.deleteItem = deleteItem ;

        vm.syncItems = [];
        vm.synchronizing = false;

        var globaltimeout = 1000 * 60 * 10;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            $rootScope.$on( 'synchronizator_update', updateList );
            $rootScope.$on( 'synchronizator_new_item', synchronizeAll );
            setTimeout( synchronizeAll, globaltimeout );
            synchronizeAll();
        }

        /**
         * @name synchronizeAll
         * @desc Synchronize tous les items
         */
        function synchronizeAll() {
            vm.synchronizing = true;
            updateList( function() {
                Synchronizator.syncItems( vm.syncItems, function() {
                    vm.synchronizing = false ;
                } );
            } );
        }

        /**
         * @name updateList
         * @desc Synchronize tous les items
         */
        function updateList(callback) {
            Synchronizator.listItems( function(syncItems) {
                $scope.$digest();
                vm.syncItems = syncItems;
                (typeof callback === "function" ? callback : function() {})();
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



