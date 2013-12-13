angular.module('smartgeomobile').controller('nightTourController', function ($scope, $rootScope, $window, $location, Smartgeo, i18n){

    'use strict' ;

    /**
     * @ngdoc method
     * @name nightTourController#initialize
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.initialize = function(){
        $rootScope.nightTourInProgress  = false;
        $scope.state  = 'closed';
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

        $scope.$watch('isFollowingMe', function(newval, oldval) {
            $scope[(newval === true ? 'start' : 'stop') + 'FollowingPosition']();
        }, true);

    };

    /**
     * @ngdoc method
     * @name nightTourController#startFollowingPosition
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.startFollowingPosition = function(){
        $scope.stopFollowingPosition();
        $scope.watchInterval = setInterval($scope.whereIAm, 3000);
    };

    /**
     * @ngdoc method
     * @name nightTourController#stopFollowingPosition
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.stopFollowingPosition = function(){
        if($scope.watchInterval){
            clearInterval($scope.watchInterval);
        }
    };

    /**
     * @ngdoc method
     * @name nightTourController#whereIAm
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.whereIAm = function(){
        Smartgeo.getUsersLocation(function(lat, lng /*, alt*/){
            $rootScope.$broadcast('__MAP_HIGHTLIGHT_MY_POSITION', lat, lng);
            $scope.addPositionToTrace( lat, lng);
        });
    };

    /**
     * @ngdoc method
     * @name nightTourController#addPositionToTrace
     * @methodOf nightTourController
     * @param {float} lat Point's latitude
     * @param {float} lng Point's longitude
     * @description
     *
     */
    $scope.addPositionToTrace = function(lat, lng){
        if(!$scope.mission){
            return alertify.error("Erreur : aucune tournée en cours");
        }
        var traces = Smartgeo.get('traces') || {},
            currentTrace = traces[$scope.mission.id] || [] ;
        currentTrace.push([lng,lat]);
        traces[$scope.mission.id] = currentTrace ;
        Smartgeo.set('traces', traces);

    };

    /**
     * @ngdoc method
     * @name nightTourController#resumeNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.resumeNightTour = function(){
        $rootScope.nightTourRecording  = true;
    };

    /**
     * @ngdoc method
     * @name nightTourController#pauseNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.pauseNightTour = function(){
        $rootScope.nightTourRecording  = false;
    };

    /**
     * @ngdoc method
     * @name nightTourController#closeNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.closeNightTour = function(){

    };

    /**
     * @ngdoc method
     * @name nightTourController#startNightTour
     * @methodOf nightTourController
     * @param {object} event        This method is called by event, so first argument is this event
     * @param {object} mission      This parameter MUST BE a night tour
     * @param {array}  assetsCache  Array of mission's assets, fetched from database
     * @description
     *
     */
    $scope.startNightTour = function(event, mission, assetsCache) {

        if($rootScope.nightTourInProgress){
            return alertify.error("Erreur : Une tournée est déjà en cours, impossible de démarrer cette tournée.");
        } else if($rootScope.site.activities._byId[mission.activity.id].type !== "night_tour"){
            return alertify.error("Erreur : L'activité de cette mission n'est pas une tournée de nuit.");
        }

        $scope.assetsCache   = assetsCache ;
        $scope.mission       = mission;
        $scope.isFollowingMe = true ;

        $rootScope.closeLeftMenu();
        $rootScope.nightTourInProgress  = true;
        $rootScope.nightTourRecording   = true;

        $scope.open();

        if(!$scope.$$phase) {
            $scope.$apply();
        }

    };

    /**
     * @ngdoc method
     * @name nightTourController#close
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.close = function(){
        $scope.state = 'closed';
    };

    /**
     * @ngdoc method
     * @name nightTourController#open
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.open = function(){
        $scope.state = 'open' ;
    };

    /**
     * @ngdoc method
     * @name nightTourController#togglePanel
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.togglePanel = function(){
        $scope[($scope.state === 'open' ? 'close' : 'open')]() ;
    };

    /**
     * @ngdoc method
     * @name nightTourController#stopNightTour
     * @methodOf nightTourController
     * @description
     *
     */
    $scope.stopNightTour = function(){
        $rootScope.nightTourInProgress = false;
    };

    /**
     * @ngdoc method
     * @name nightTourController#locateMission
     * @methodOf nightTourController
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
