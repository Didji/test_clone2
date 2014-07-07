angular.module('smartgeomobile').controller('menuController', ["$scope", "$routeParams", "$window", "$rootScope", "Smartgeo", "SQLite", "i18n", "$timeout" , "$http", "$location",  function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout, $http, $location) {

    'use strict';


    $scope.initialize = function(){
        $scope.display = true;

        for(var menuItem in $scope.menuItems){
            $scope.menuItems[menuItem].displayMenuItem = $rootScope.rights[$scope.menuItems[menuItem].id]  && ($scope.menuItems[menuItem].specialVisibility ? $scope[$scope.menuItems[menuItem].specialVisibility]() : true );
            $scope.menuItems[menuItem].displayItemContent = false ;
        }

        for(var menuItem in $scope.bottomMenuItems){
            $scope.bottomMenuItems[menuItem].displayMenuItem = $rootScope.rights[$scope.bottomMenuItems[menuItem].id]  && ($scope.bottomMenuItems[menuItem].specialVisibility ? $scope[$scope.bottomMenuItems[menuItem].specialVisibility]() : true );
            $scope.bottomMenuItems[menuItem].displayItemContent = false ;
        }

        $scope.siteSelectionEnable = false ;

        $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

        $rootScope.$on('DEVICE_IS_ONLINE',$scope.checkIfMoreThanOneSiteIsAvailable);
        $rootScope.$on('DEVICE_IS_OFFLINE',$scope.checkIfMoreThanOneSiteIsAvailable);

        $scope.checkIfMoreThanOneSiteIsAvailable();

        $rootScope.$watch('reports', function (event) {

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
        });

    };

    $scope.menuItems = [
        {
            id : 'search',
            label: i18n.get('_MENU_SEARCH'),
            icon: "icon icon-search",
            template: 'partials/search.html',
        },
        {
            id : 'planning',
            label: i18n.get('_MENU_PLANNING'),
            icon: "icon icon-calendar",
            template: 'partials/planning.html',
        },
        {
            id : 'census',
            label: i18n.get('_MENU_CENSUS'),
            icon: "icon icon-plus",
            template: 'partials/census.html',
        },
        {
            id : 'activelayers',
            label: i18n.get('_MENU_ACTIVE_LAYERS'),
            icon: "icon icon-list-ul",
            template: 'partials/layers.html',
        },
        {
            id : 'synccenter',
            label: i18n.get('_MENU_SYNC'),
            icon: "icon icon-refresh",
            template: 'partials/synchronizationMenu.html',
        },
    ];

    $scope.bottomMenuItems = [
        {
            id : 'consultation',
            label: 'Consultation',
            icon: "icon icon-info-sign",
            action: 'activateConsultation',
        },{
            id : 'myposition',
            label: 'Ma position',
            icon: "icon icon-compass",
            action: 'activatePosition',
        },{
            id : 'siteselection',
            label: 'Selection de site',
            icon: "icon icon-exchange",
            action: 'changeSite',
            specialVisibility : 'checkIfMoreThanOneSiteIsAvailable'
        },{
            id : 'logout',
            label: 'Déconnexion',
            icon: "icon icon-power-off redicon",
            action: 'logout',
        }
    ];

    $scope.checkIfMoreThanOneSiteIsAvailable = function(){
        $scope.siteSelectionEnable =  (  Smartgeo.get('availableLocalSites')  > 1 ) || (  Smartgeo.get('online') && Smartgeo.get('availableRemoteSites') > 1 );
        if (!$scope.$$phase) {
            $scope.$apply();
        }
        return $scope.siteSelectionEnable;
    }

    $scope.execute = function(item){
        if($scope[item.action]){
            return $scope[item.action]();
        } else {
            $scope.showItem(item);
        }
    };

    $scope.showItem = function(item){
        for(var menuItem in $scope.menuItems){
            $scope.menuItems[menuItem].displayMenuItem = false ;
            $scope.menuItems[menuItem].displayItemContent = false ;
        }
        item.displayItemContent = true;
    };

    $scope.home = function(){
        for(var menuItem in $scope.menuItems){
            $scope.menuItems[menuItem].displayMenuItem = true ;
            $scope.menuItems[menuItem].displayItemContent = false ;
        }
    };

    $scope.logout = function () {
        alertify.confirm( "Voulez vous QOUITTER l'application", function (yes) {
            if (!yes) {  return; }
            $location.path('/') ;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };

    $scope.changeSite = function () {
        alertify.confirm( "Voulez vous QOUITTER l'application ou changer de site", function (yes) {
            if (!yes) {  return; }
            $location.path('/sites/') ;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };

    $scope.activateConsultation = function () {
        $rootScope.$broadcast("ACTIVATE_CONSULTATION");
        $scope.display = false ;
    };

    $scope.activatePosition = function () {
        $rootScope.$broadcast("ACTIVATE_POSITION");
        $scope.display = false ;
    };

}]);
