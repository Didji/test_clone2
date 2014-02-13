angular.module('smartgeomobile').controller('censusController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout, ComplexAssetFactory) {

    'use strict';

    window.asset = new ComplexAssetFactory(9);
    // asset.add();
    // ComplexAsset.add()

    console.log(asset) ;

    // $scope.dependancies = {
    //     "1": {
    //         parents: [],
    //         children: [4],
    //         isGraphic : true
    //     },
    //     "2": {
    //         parents: [],
    //         children: [],
    //         isGraphic : true
    //     },
    //     "4": {
    //         parents: [1],
    //         children: [],
    //         isGraphic : false
    //     },
    //     "5": {
    //         parents: [7],
    //         children: [],
    //         isGraphic : true
    //     },
    //     "7": {
    //         parents: [9],
    //         children: [5],
    //         isGraphic : true
    //     },
    //     "9": {
    //         parents: [],
    //         children: [7],
    //         isGraphic : false
    //     }
    // };

    // $timeout(function(){
    //     $rootScope.mlPushMenu = new mlPushMenu(document.getElementById('mp-menu'), document.getElementById('trigger'), {
    //         type: 'cover'
    //     });

    // },1000)



});
