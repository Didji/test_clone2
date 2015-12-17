(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'SyncCenterController', SyncCenterController );

    SyncCenterController.$inject = ["$scope", "$rootScope", "Synchronizator", "i18n", "Storage", "$interval"];

    /**
     * @class SyncCenterController
     * @desc Controlleur du menu de gestion des parametres
     */
    function SyncCenterController($scope, $rootScope, Synchronizator, i18n, Storage, $interval) {

        var vm = this;

        vm.synchronize = synchronize ;
        vm.synchronizeAll = synchronizeAll ;
        vm.updateList = updateList ;
        vm.deleteItem = deleteItem ;

        vm.syncItems = [];
        vm.synchronizing = false;
        $rootScope.$on('DEVICE_IS_ONLINE', activate);
        $rootScope.$on('DEVICE_IS_OFFLINE', desactivate);
        $rootScope.$on( 'synchronizator_update', updateList );
        $rootScope.$on( 'synchronizator_new_item', synchronizeAll );


       $scope.syncOnline;//for the view condition
        var globalinterval = 1000 * 60;
        var syncAllInterval;
        var checkSyncReportInterval;
        updateList();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            $scope.syncOnline = Storage.get("online");
            syncAllInterval =  $interval( synchronizeAll, globalinterval );
            checkSyncReportInterval =  $interval( Synchronizator.checkSynchronizedReports, globalinterval );
            synchronizeAll();
        }

         /**
         * @name desactivate
         * @desc Fonction cancel Intervals
         */
        function desactivate() {
            $scope.syncOnline = Storage.get("online");
            $interval.cancel( syncAllInterval );
            $interval.cancel( checkSyncReportInterval );
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
                vm.synchronizing = false ;
                if(Storage.get("online")===true){
                    Synchronizator.syncItems( vm.syncItems, function() {
                            $rootScope.$broadcast("endSynchroniseAll");
                    });
                }else{
                    console.log("Synchronisation en attente de connexion");
                        $rootScope.$broadcast( 'syncOffline' );
                }
            } );
        }

        /**
         * @name updateList
         * @desc Synchronize tous les items
         */
        function updateList(callback) {
            Synchronizator.listItemsNotInProject( function(syncItems) {
                $rootScope.syncBadgeItems= vm.syncItems = syncItems;
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



