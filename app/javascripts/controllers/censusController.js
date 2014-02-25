angular.module('smartgeomobile').controller('censusController', function ($scope, $rootScope, ComplexAssetFactory, G3ME) {

    'use strict';

    $scope.map  = G3ME.map ;

    $scope.startCensus = function(okey){
        $scope.okey = okey ;
    };
    $scope.cancel = function(){
        $scope.okey = undefined ;
    };

});
