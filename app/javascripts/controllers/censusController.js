angular.module('smartgeomobile').controller('censusController', ["$scope", "$rootScope", "ComplexAssetFactory", "G3ME", function ($scope, $rootScope, ComplexAssetFactory, G3ME) {

    'use strict';

    $scope.classindex  = "0";

    $scope.startCensus = function(okey){
        $scope.okey = okey ;
    };

    $scope.cancel = function(){
        $scope.okey = null;
    };

    $scope.site = window.currentSite;

}]);
