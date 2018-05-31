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
        //on tue les capteurs d'events avant de les reinitialiser. 
        //sinon ils se declenchent plusieurs fois 
        if( typeof $rootScope.on_device_is_online != 'undefined'){
            $rootScope.on_device_is_online();
        }
        if( typeof $rootScope.on_device_is_offline != 'undefined'){
            $rootScope.on_device_is_offline();
        }
        if( typeof $rootScope.on_synchronizator_update != 'undefined'){
            $rootScope.on_synchronizator_update();
        }
        if( typeof $rootScope.on_synchronizator_new_item != 'undefined'){
            $rootScope.on_synchronizator_new_item();
        }
        $rootScope.on_device_is_online = $rootScope.$on('DEVICE_IS_ONLINE', activate);
        $rootScope.on_device_is_offline = $rootScope.$on('DEVICE_IS_OFFLINE', desactivate);
        $rootScope.on_synchronizator_update = $rootScope.$on( 'synchronizator_update', updateList );
        $rootScope.on_synchronizator_new_item= $rootScope.$on( 'synchronizator_new_item', synchronizeAll );


       $scope.syncOnline;//for the view condition
        var globalinterval = 1000 * 60;
        updateList();

        // au lancement de l'application l'instanciation du controlleur ce fait apres le smartgeo.initialise , et donc l'evenement $on de ce controlleur est instancier apres le $broadcast de la factory smartgeo; mais on peut toutefois s'appuyer sur la variable online dans le localstorage.
        if(Storage.get("online")){
            activate();
        } else {
            desactivate();
        }

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            //on annule d'abord tout les intervals de synchronisation , sinon on crée plusieurs intervals à chaque activate
            desactivate();
            $scope.syncOnline = Storage.get("online");
            $rootScope.syncAllInterval =  $interval( synchronizeAll, globalinterval );
            $rootScope.checkSyncReportInterval =  $interval( Synchronizator.checkSynchronizedReports, globalinterval );
            synchronizeAll();
        }

         /**
         * @name desactivate
         * @desc Fonction cancel Intervals
         */
        function desactivate() {
            $scope.syncOnline = Storage.get("online");
            $interval.cancel( $rootScope.syncAllInterval );
            $interval.cancel( $rootScope.checkSyncReportInterval );
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



