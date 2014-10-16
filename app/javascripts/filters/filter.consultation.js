(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .filter('prettifyField', prettifyField)
        .filter('consultationTabsFilter', consultationTabsFilter)
        .filter('consultationFieldsFilter', consultationFieldsFilter)
        .filter('reportTabsFilter', reportTabsFilter)
        .filter('reportFieldsFilter', reportFieldsFilter)
        .filter('activityListFilter', activityListFilter)
        .filter('isLink', isLink);

    function prettifyField() {
        /**
         * @name prettifyField_
         * @desc
         */
        function prettifyField_(s) {
            if ('string' !== typeof s) {
                return s;
            }
            return ((s + '') || '').replace(/\\n/g, '\n');
        }
        return prettifyField_;
    }

    function consultationTabsFilter() {
        /**
         * @name consultationTabsFilter_
         * @desc
         */
        function consultationTabsFilter_(tabsIn, asset) {
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
        }
        return consultationTabsFilter_;
    }

    consultationFieldsFilter.$inject = [];

    function consultationFieldsFilter() {
        /**
         * @name consultationFieldsFilter_
         * @desc
         */
        function consultationFieldsFilter_(fieldsIn, asset) {
            var fieldsOut = [];
            for (var i = 0; i < fieldsIn.length; i++) {
                if (asset.attributes[fieldsIn[i].key] ||
                    (
                        fieldsIn[i].options &&
                        window.SMARTGEO_CURRENT_SITE.lists &&
                        asset.attributes[fieldsIn[i].key] &&
                        window.SMARTGEO_CURRENT_SITE.lists[fieldsIn[i].options] &&
                        window.SMARTGEO_CURRENT_SITE.lists[fieldsIn[i].options][asset.attributes[fieldsIn[i].key]]
                    )
                ) {
                    fieldsOut.push(fieldsIn[i]);
                }
            }
            return fieldsOut;
        }
        return consultationFieldsFilter_;
    }

    function reportTabsFilter() {
        /**
         * @name reportTabsFilter_
         * @desc
         */
        function reportTabsFilter_(tabsIn, report) {
            var tabsOut = [];
            for (var i = 0; i < tabsIn.length; i++) {
                for (var j = 0; j < tabsIn[i].fields.length; j++) {
                    var field = tabsIn[i].fields[j];
                    if (report.fields[field.id]) {
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
        }
        return reportTabsFilter_;
    }

    reportFieldsFilter.$inject = ["$rootScope"];

    function reportFieldsFilter() {
        /**
         * @name reportFieldsFilter_
         * @desc
         */
        function reportFieldsFilter_(fieldsIn, report) {
            var fieldsOut = [];
            for (var i = 0; i < fieldsIn.length; i++) {
                if (((report.fields[fieldsIn[i].id] ||
                        (
                            fieldsIn[i].options &&
                            window.SMARTGEO_CURRENT_SITE.lists &&
                            report.fields[fieldsIn[i].id] &&
                            window.SMARTGEO_CURRENT_SITE.lists[fieldsIn[i].options] &&
                            window.SMARTGEO_CURRENT_SITE.lists[fieldsIn[i].options][report.fields[fieldsIn[i].id]])
                    )) &&
                    JSON.stringify(report.fields[fieldsIn[i].id]) !== '{}'
                ) {
                    fieldsOut.push(fieldsIn[i]);
                }
            }
            return fieldsOut;
        }
        return reportFieldsFilter_;
    }

    activityListFilter.$inject = [];

    function activityListFilter() {

        /**
         * @name activityListFilter_
         * @desc
         */
        function activityListFilter_(asset) {
            if (asset.length) {
                asset = asset[0];
            }
            var activitiesOut = [];
            for (var i = 0; i < window.SMARTGEO_CURRENT_SITE.activities.length; i++) {
                if (window.SMARTGEO_CURRENT_SITE.activities[i].okeys[0] === asset.okey) {
                    activitiesOut.push(window.SMARTGEO_CURRENT_SITE.activities[i]);
                }
            }
            return activitiesOut;
        }
        return activityListFilter_;
    }

    function isLink() {
        /**
         * @name isLink_
         * @desc
         */
        function isLink_(s) {
            return ((s + '') || '').search(/(https?:\/\/.*)$/);
        }
        return isLink_;
    }

})();
