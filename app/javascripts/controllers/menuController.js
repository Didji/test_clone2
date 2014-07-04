angular.module('smartgeomobile').controller('menuController', ["$scope", "$routeParams", "$window", "$rootScope", "Smartgeo", "SQLite", "i18n", "$timeout" , "$http",  function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout, $http) {

    'use strict';

    $scope.siteSelectionEnable = false ;

    $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

    function checkIfMoreThanOneSiteIsAvailable(){
        $scope.siteSelectionEnable =  (  Smartgeo.get('availableLocalSites')  > 1 ) || (  Smartgeo.get('online') && Smartgeo.get('availableRemoteSites') > 1 );
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }

    $rootScope.$on('DEVICE_IS_ONLINE',checkIfMoreThanOneSiteIsAvailable);
    $rootScope.$on('DEVICE_IS_OFFLINE',checkIfMoreThanOneSiteIsAvailable);

    checkIfMoreThanOneSiteIsAvailable();

    function updateSyncNumber(event) {

        $scope.toSyncNumber = 0;

        if($rootScope.reports && $rootScope.reports._byUUID){
            for (var uuid in $rootScope.reports._byUUID) {
                if (!$rootScope.reports._byUUID[uuid].synced) {
                    $scope.toSyncNumber++;
                }
            }
        }
        if($rootScope.censusAssets && $rootScope.censusAssets._byUUID){
            for (var uuid in $rootScope.censusAssets._byUUID) {
                if (!$rootScope.censusAssets._byUUID[uuid].synced) {
                    $scope.toSyncNumber++;
                }
            }
        }
    }

    $scope.activateConsultation = function (event) {
        event.preventDefault();
        $rootScope.$broadcast("ACTIVATE_CONSULTATION");
        $scope.close();
        return false;
    };

    $scope.activatePosition = function (event) {
        event.preventDefault();
        $rootScope.$broadcast("ACTIVATE_POSITION");
        $scope.close();
        return false;
    };

    $rootScope.$watch('reports', updateSyncNumber);

}]);
