(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'SyncCenterController', SyncCenterController );

    SyncCenterController.$inject = ["$scope", "$rootScope", "Synchronizator", "i18n"];

    /**
     * @class SyncCenterController
     * @desc Controlleur du menu de gestion des parametres
     */
    function SyncCenterController($scope, $rootScope, Synchronizator, i18n) {

        var vm = this;

        vm.synchronize = synchronize ;
        vm.synchronizeAll = synchronizeAll ;
        vm.updateList = updateList ;
        vm.deleteItem = deleteItem ;

        vm.syncItems = [];
        vm.synchronizing = false;

        var globalinterval = 1000 * 60;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            $rootScope.$on( 'synchronizator_update', updateList );
            $rootScope.$on( 'synchronizator_new_item', synchronizeAll );
            setInterval( synchronizeAll, globalinterval );
            setInterval( Synchronizator.checkSynchronizedReports, globalinterval );
            synchronizeAll();
        }

        /**
         * @name synchronizeAll
         * @desc Synchronize tous les items
         */
        function synchronizeAll() {
            if (vm.synchronizing) {
                return;
            }
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
            Synchronizator.listItemsNotInProject( function(syncItems) {
                vm.syncItems = syncItems;
                $scope.$digest();
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
            alertify.confirm( i18n.get( '_SYNC_CONFIRM_DELETE_ASSET_' ) , function(yes) {
                if (!yes) {
                    return;
                }
                Synchronizator.deleteItem( item );
            });
        }

    }

})();



