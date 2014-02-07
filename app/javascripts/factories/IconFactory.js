angular.module('smartgeomobile').factory('Icon', function ($http, Smartgeo, $q, $rootScope) {

    'use strict';

    var Icon = {
        get: function (name) {
            return Icon[name];
        },

        SELECTED_MISSION: L.icon({
            iconUrl: "data:image/png;base64,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",
            iconSize: [65, 89],
            iconAnchor: [32, 89],
        }),
        NON_SELECTED_MISSION: L.icon({
            iconUrl: "data:image/png;base64,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",
            iconSize: [49, 67],
            iconAnchor: [25, 67],
        }),
        NON_SELECTED_NIGHTTOUR: L.icon({
            iconUrl: "data:image/png;base64,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",
            iconSize: [49, 67],
            iconAnchor: [25, 67],
        }),
        DONE_MISSION: L.icon({
            iconUrl: "data:image/png;base64,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",
            iconSize: [30, 42],
            iconAnchor: [15, 42],
        }),
        DONE_NIGHTTOUR: L.icon({
            iconUrl: "data:image/png;base64,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",
            iconSize: [30, 42],
            iconAnchor: [15, 42],
        }),
        CONSULTATION: L.icon({
            iconUrl: "data:image/png;base64,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",
            iconSize: [49, 67],
            iconAnchor: [25, 67],
        }),


        GRAY_TARGET: L.icon({
            iconUrl: 'javascripts/vendors/images/target_gray.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        }),
        TARGET: L.icon({
            iconUrl: 'javascripts/vendors/images/target.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        }),
    };
    return Icon;
});
