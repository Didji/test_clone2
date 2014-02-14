angular.module('smartgeomobile').controller('censusController', function ($scope,ComplexAssetFactory) {
    'use strict';
    window.root = $scope.root = new ComplexAssetFactory(9);
});
