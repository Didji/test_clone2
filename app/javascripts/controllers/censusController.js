angular.module('smartgeomobile').controller('censusController', function ($scope, $rootScope, ComplexAssetFactory, G3ME) {

    'use strict';

    $scope.map  = G3ME.map ;
    $scope.classindex  = "0";

    $scope.startCensus = function(okey){
        $scope.okey = okey ;
    };

    $scope.cancel = function(){
        $scope.okey = null;
    };

});
