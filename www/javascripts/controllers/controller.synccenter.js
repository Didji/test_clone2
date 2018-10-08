(function() {
    "use strict";

    angular.module("smartgeomobile").controller("SyncCenterController", SyncCenterController);

    SyncCenterController.$inject = ["$scope", "$rootScope", "Synchronizator", "i18n", "Storage", "$interval", "Site"];

    /**
     * @class SyncCenterController
     * @desc Controlleur du menu de gestion des parametres
     */
    function SyncCenterController($scope, $rootScope, Synchronizator, i18n, Storage, $interval, Site) {
        var vm = this;

        vm.synchronize = synchronize;
        vm.synchronizeAll = synchronizeAll;
        vm.updateList = updateList;
        vm.deleteItem = deleteItem;

        vm.syncItems = [];
        vm.synchronizing = false;
        //on tue les capteurs d'events avant de les reinitialiser.
        //sinon ils se declenchent plusieurs fois
        if (typeof $rootScope.on_device_is_online != "undefined") {
            $rootScope.on_device_is_online();
        }
        if (typeof $rootScope.on_device_is_offline != "undefined") {
            $rootScope.on_device_is_offline();
        }
        if (typeof $rootScope.on_synchronizator_update != "undefined") {
            $rootScope.on_synchronizator_update();
        }
        if (typeof $rootScope.on_synchronizator_new_item != "undefined") {
            $rootScope.on_synchronizator_new_item();
        }
        $rootScope.on_device_is_online = $rootScope.$on("DEVICE_IS_ONLINE", activate);
        $rootScope.on_device_is_offline = $rootScope.$on("DEVICE_IS_OFFLINE", desactivate);
        $rootScope.on_synchronizator_update = $rootScope.$on("synchronizator_update", updateList);
        $rootScope.on_synchronizator_new_item = $rootScope.$on("synchronizator_new_item", synchronizeAll);

        $scope.syncOnline; //for the view condition
        // Temps de synchronisation automatique des rapports : 1min
        $scope.globalReportInterval = 1000 * 60 * 1;
        // Temps de synchronisation automatique des items : 15min
        $scope.globalItemInterval = 1000 * 60 * 5;
        updateList();

        // au lancement de l'application l'instanciation du controlleur ce fait apres le smartgeo.initialise , et donc l'evenement $on de ce controlleur est instancier apres le $broadcast de la factory smartgeo; mais on peut toutefois s'appuyer sur la variable online dans le localstorage.
        if (Storage.get("online")) {
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
            $rootScope.syncAllInterval = $interval(function() {
                var siteLastUpdate = new Date(Site.current.timestamp * 1000);
                var now = new Date();
                // On ne déclenche la synchronisation que le ref. est périmé depuis plus de 24h
                if (now - siteLastUpdate > 24 * 60 * 60 * 1000) {
                    synchronizeAll();
                }
            }, $scope.globalItemInterval);
            // On déclare l'interval de mise de synchronisation des CR
            $rootScope.checkSyncReportInterval = $interval(
                Synchronizator.checkSynchronizedReports,
                $scope.globalReportInterval
            );
        }

        /**
         * @name desactivate
         * @desc Fonction cancel Intervals
         */
        function desactivate() {
            $scope.syncOnline = Storage.get("online");
            $interval.cancel($rootScope.syncAllInterval);
            $interval.cancel($rootScope.checkSyncReportInterval);
        }

        /**
         * @name synchronizeAll
         * @desc Synchronize tous les items
         */
        function synchronizeAll() {
            // Si nous sommes déjà en synchronisation
            if (vm.synchronizing) {
                return;
            }
            vm.synchronizing = true;
            updateList(function() {
                vm.synchronizing = false;
                if (Storage.get("online") === true) {
                    Synchronizator.syncItems(vm.syncItems, function() {
                        $rootScope.$broadcast("endSynchroniseAll");
                    });
                } else {
                    $rootScope.$broadcast("syncOffline");
                }
            });
        }

        /**
         * @name updateList
         * @desc Synchronize tous les items
         */
        function updateList(callback) {
            Synchronizator.listItemsNotInProject(function(syncItems) {
                $rootScope.syncBadgeItems = vm.syncItems = syncItems;
                $scope.$digest();
                (typeof callback === "function" ? callback : function() {})();
            });
        }

        /**
         * @name synchronize
         * @desc Synchronize un item en particulier
         */
        function synchronize(item) {
            Synchronizator.syncItems(item);
        }

        /**
         * @name deleteItem
         * @desc Supprime un item en particulier
         */
        function deleteItem(item) {
            alertify.confirm(i18n.get("_SYNC_CONFIRM_DELETE_ASSET_"), function(yes) {
                if (!yes) {
                    return;
                }
                Synchronizator.deleteItem(item);
            });
        }
    }
})();
