angular.module('smartgeomobile').controller('censusController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout, ComplexAssetFactory) {

    'use strict';

    window.asset = new ComplexAssetFactory(9);
    window.asset.duplicateNode(window.asset.children[0].uuid);
    window.asset.duplicateNode(window.asset.children[0].uuid);
    $scope.asset = window.asset ;
    window.asset.__log();

    $scope.addChild = function(uuid){
        $scope.asset.addNode(uuid) ;
    };

});
