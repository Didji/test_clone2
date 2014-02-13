angular.module('smartgeomobile').controller('censusController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout, ComplexAssetFactory) {

    'use strict';

    window.asset = new ComplexAssetFactory(9);
    window.asset.__log();


});
