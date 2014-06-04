angular.module("smartgeobootstrap", []).run(function ($rootScope) {
    window.smartgeoPersistenceSQLite.get('sites', function (sites) {
        window.smartgeoRightsManager = {
            'report'                :  true,
            'goto'                  :  true,
            'planning'              :  true,
            'media'                 :  true,
            'census'                :  true,
            'logout'                :  true,
            '_DONT_REALLY_RESET'    : false,
            'tileCache'             : navigator.userAgent.match(/Android/i) ? true : false,
            // 'tileCache'             : true,
            'timebomb'              : false
        };
        window.smartgeoPersistenceCache  = {};
        window.smartgeoPersistenceCache_ = {
            sites: sites
        };

        if (!navigator.userAgent.match(/Android/i)) {
            window.SmartgeoChromium = false;
        }

        if(!window.ChromiumCallbacks){
            window.ChromiumCallbacks = [];
        }

        if(window.smartgeoRightsManager.timebomb){
            window.expirationDate = "02/14/2015" ; // mm/jj/aaaa
            if((new Date()) > (new Date(window.expirationDate))){
                alertify.alert("Votre licence a expiré.");
                return false ;
            }
        }

        angular.bootstrap(document, ['smartgeomobile']);
    });
});
