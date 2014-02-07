angular.module("smartgeobootstrap", []).run(function ($rootScope) {
    (window.indexedDB ? window.smartgeoPersistenceIndexedDB : window.smartgeoPersistenceSQLite).get('sites', function (sites) {
        window.smartgeoRightsManager = {
            'report'                : true,
            'goto'                  : true,
            'planning'              : true,
            'media'                 : true,
            'logout'                : true,
            '_DONT_REALLY_RESET'    : false
        };
        window.smartgeoPersistenceCache = {};
        window.smartgeoPersistenceCache_ = {
            sites: sites
        };

        if (!navigator.userAgent.match(/Android/i)) {
            window.SmartgeoChromium = false;
        }

        window.ChromiumCallbacks = [];

        angular.bootstrap(document, ['smartgeomobile']);
    });
});
