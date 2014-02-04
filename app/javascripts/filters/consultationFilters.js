angular.module('smartgeomobile').filter('prettifyField', function () {

    'use strict';

    return function (s) {
        if ('string' !== typeof s) {
            return s;
        }
        return ((s + '') || '').replace(/\\n/g, '\n');
    };
}).filter('consultationTabsFilter', function () {

    'use strict';

    return function (tabsIn, asset) {
        var tabsOut = [];
        for (var i = 0; i < tabsIn.length; i++) {
            for (var j = 0; j < tabsIn[i].fields.length; j++) {
                var field = tabsIn[i].fields[j];
                if (asset.attributes[field.key]) {
                    tabsIn[i].nonBlankField = (tabsIn[i].nonBlankField || 0) + 1;
                }
            }
        }
        for (i = 0; i < tabsIn.length; i++) {
            if ((tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0)) {
                tabsOut.push(tabsIn[i]);
            }
        }
        return tabsOut;
    };
}).filter('consultationFieldsFilter', function ($rootScope) {

    'use strict';

    return function (fieldsIn, asset) {
        var fieldsOut = [];
        for (var i = 0; i < fieldsIn.length; i++) {
            if (asset.attributes[fieldsIn[i].key] ||
                (
                    fieldsIn[i].options &&
                    $rootScope.site.lists &&
                    asset.attributes[fieldsIn[i].key] &&
                    $rootScope.site.lists[fieldsIn[i].options] &&
                    $rootScope.site.lists[fieldsIn[i].options][asset.attributes[fieldsIn[i].key]]
                )
            ) {
                fieldsOut.push(fieldsIn[i]);
            }
        }
        return fieldsOut;
    };
}).filter('activityListFilter', function ($rootScope) {

    'use strict';

    return function (activitiesIn, asset) {
        var activitiesOut = [];
        for (var i = 0; i < activitiesIn.length; i++) {
            if (activitiesIn[i].okeys[0] === asset.okey) {
                activitiesOut.push(activitiesIn[i]);
            }
        }
        return activitiesOut;
    };
});
