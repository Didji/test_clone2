angular.module('smartgeomobile').controller('nightTourController', function ($scope, $rootScope, $window, $location, Smartgeo, i18n){

    'use strict' ;

    $scope.initialize = function(){
        $scope.state  = 'closed';
        $rootScope.nightTourInProgress  = false;
        $scope.$on("START_NIGHT_TOUR", $scope.startNightTour);


        $scope.$watch('nightTourInProgress', function(newval, oldval) {
            if(newval === true){
                $scope.open();
            } else {
                if(oldval === true){
                    $rootScope.openLeftMenu();
                }
                $scope.close();
            }
        }, true);

    };

    $scope.resumeNightTour = function(){
        $rootScope.nightTourRecording  = true;
    };

    $scope.pauseNightTour = function(){
        $rootScope.nightTourRecording  = false;
    };

    $scope.startNightTour = function(event, mission, assetsCache) {
        $scope.assetsCache = assetsCache ;
        $scope.mission = mission;
        $rootScope.closeLeftMenu();
        $rootScope.nightTourInProgress  = true;
        $rootScope.nightTourRecording   = true;
        $scope.open();
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    };

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


    $scope.stopNightTour = function(){
        $rootScope.nightTourInProgress = false;
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
