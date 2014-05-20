angular.module('smartgeomobile').controller('layersController', function ($scope, $rootScope, G3ME, i18n) {

    'use strict';

    function checkGroup(g) {
        var stat = false,
            lays = g.layers;

        for (var i in lays) {
            stat = stat || lays[i].status;
        }
        g.status = stat;
    }

    var groups = {}, o, layers = {}, layer,
        vis = G3ME.getVisibility();
    for (var i in window.currentSite.metamodel) {
        o = window.currentSite.metamodel[i];
        if (!(o.group in groups)) {
            groups[o.group] = {
                label: o.group,
                status: true,
                layers: []
            };
        }
        layer = {
            status: (vis === false) || !! vis[o.okey],
            label: o.label,
            okey: o.okey
        };
        groups[o.group].layers.push(layer);
        layers[o.okey] = layer;
    }
    for (i in groups) {
        checkGroup(groups[i]);
    }

    $scope.groups = groups;
    $scope.layers = layers;


    $scope.refreshView = function () {
        for (var i in $scope.groups) {
            checkGroup($scope.groups[i]);
        }

        G3ME.setVisibility($scope.layers);
    };

    $scope.updateGroups = function (gid) {
        var g = $scope.groups[gid],
            stat = g.status,
            lays = g.layers;

        for (var i in lays) {
            lays[i].status = stat;
        }
        $scope.refreshView();
    };

});
