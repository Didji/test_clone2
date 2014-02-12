angular.module('smartgeomobile').controller('censusController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n) {

    'use strict';

    $scope.dependancies = {
        "1": {
            parents: [],
            children: [2, 3],
            isGraphic : true
        },
        "2": {
            parents: [1],
            children: [4,5],
            isGraphic : true
        },
        "3": {
            parents: [5],
            children: [5,7],
            isGraphic : false
        },
        "4": {
            parents: [],
            children: [],
            isGraphic : false
        },
        "5": {
            parents: [],
            children: [],
            isGraphic : true
        },
        "7": {
            parents: [],
            children: [],
            isGraphic : true
        },
        "9": {
            parents: [],
            children: [],
            isGraphic : false
        }
    };

});
