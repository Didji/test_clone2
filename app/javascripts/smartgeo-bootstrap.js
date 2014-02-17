angular.module("smartgeobootstrap", []).run(function ($rootScope) {
    (window.indexedDB ? window.smartgeoPersistenceIndexedDB : window.smartgeoPersistenceSQLite).get('sites', function (sites) {
        window.smartgeoRightsManager = {
            'report'                :  false,
            'goto'                  :  false,
            'planning'              :  false,
            'media'                 :  true,
            'logout'                :  false,
            '_DONT_REALLY_RESET'    :  true,
            'tileCache'             :  true
        };
        window.smartgeoPersistenceCache  = {};
        window.smartgeoPersistenceCache_ = {
            sites: sites
        };

        if (!navigator.userAgent.match(/Android/i)) {
            window.SmartgeoChromium = false;
        }

        window.ChromiumCallbacks = [];

        window.expirationDate = "02/14/2015" ; // mm/jj/aaaa
        if((new Date()) > (new Date(window.expirationDate))){
            alertify.alert("Votre licence a expiré.");
            return false ;
        }

        angular.bootstrap(document, ['smartgeomobile']);
    });
});
