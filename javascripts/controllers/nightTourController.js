angular.module('smartgeomobile').controller('nightTourController', function ($scope, $rootScope, $window, $location, Smartgeo, i18n){

    'use strict' ;

    $scope.state  = 'closed';

    $rootScope.nightTourInProgress  = false;

    $scope.$on("START_NIGHT_TOUR", function(event, mission, assetsCache) {
        console.log(assetsCache);
        $scope.assetsCache = assetsCache ;
        $scope.mission = mission;
        $rootScope.closeLeftMenu();
        $rootScope.nightTourInProgress  = true;
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    });

    $scope.close = function(){
        $scope.state = 'closed';
    };

    $scope.open = function(){
        if(Smartgeo.isRunningOnLittleScreen()){
            $rootScope.$broadcast('_MENU_CLOSE_');
        }
        $scope.state = 'open' ;
    };

    $scope.togglePanel = function(){
        $scope[($scope.state === 'open' ? 'close' : 'open')]() ;
    };




    /**
     * @ngdoc method
     * @name nightTourController#locateMission
     * @methodOf nightTourController
     * @param {integer} $index index of concerned mission in $scope.missions attribute
     * @description
     * Set map view to the mission's extent. If mission has no extent yet, it set it.
     */
    $scope.locateMission = function(){
        if(!$scope.mission.extent){
            $scope.mission.extent = G3ME.getExtentsFromAssetsList($scope.assetsCache[$scope.mission.id]);
        }
        $rootScope.$broadcast('__MAP_SETVIEW__', $scope.mission.extent);
    };

});
