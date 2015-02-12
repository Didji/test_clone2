(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .filter( 'prettifyField', prettifyField )
        .filter( 'consultationTabsFilter', consultationTabsFilter )
        .filter( 'consultationFieldsFilter', consultationFieldsFilter )
        .filter( 'reportTabsFilter', reportTabsFilter )
        .filter( 'reportFieldsFilter', reportFieldsFilter )
        .filter( 'activityListFilter', activityListFilter )
        .filter( 'isLink', isLink );

    function prettifyField() {
        /**
         * @name _prettifyField
         * @desc
         */
        function _prettifyField(s) {
            if ('string' !== typeof s) {
                return s;
            }
            return ((s + '') || '').replace( /\\n/g, '\n' );
        }
        return _prettifyField;
    }

    function consultationTabsFilter() {
        /**
         * @name _consultationTabsFilter
         * @desc
         */
        function _consultationTabsFilter(tabsIn, asset) {
            tabsIn = tabsIn || [];
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
                if ( (tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0) ) {
                    tabsOut.push( tabsIn[i] );
                }
            }
            return tabsOut;
        }
        return _consultationTabsFilter;
    }

    consultationFieldsFilter.$inject = ["Site"];

    function consultationFieldsFilter(Site) {
        /**
         * @name _consultationFieldsFilter
         * @desc
         */
        function _consultationFieldsFilter(fieldsIn, asset) {
            var fieldsOut = [];
            for (var i = 0; i < fieldsIn.length; i++) {
                if (asset.attributes[fieldsIn[i].key] ||
                    (
                    fieldsIn[i].options &&
                    Site.current.lists &&
                    asset.attributes[fieldsIn[i].key] &&
                    Site.current.lists[fieldsIn[i].options] &&
                    Site.current.lists[fieldsIn[i].options][asset.attributes[fieldsIn[i].key]]
                )
                ) {
                    fieldsOut.push( fieldsIn[i] );
                }
            }
            return fieldsOut;
        }
        return _consultationFieldsFilter;
    }

    function reportTabsFilter() {
        /**
         * @name _reportTabsFilter
         * @desc
         */
        function _reportTabsFilter(tabsIn, report) {
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
                if ( (tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0) ) {
                    tabsOut.push( tabsIn[i] );
                }
            }
            return tabsOut;
        }
        return _reportTabsFilter;
    }

    reportFieldsFilter.$inject = ["Site"];

    function reportFieldsFilter(Site) {
        /**
         * @name _reportFieldsFilter
         * @desc
         */
        function _reportFieldsFilter(fieldsIn, report) {
            var fieldsOut = [];
            for (var i = 0; i < fieldsIn.length; i++) {
                if (((report.fields[fieldsIn[i].id] ||
                    (
                    fieldsIn[i].options &&
                    Site.current.lists &&
                    report.fields[fieldsIn[i].id] &&
                    Site.current.lists[fieldsIn[i].options] &&
                    Site.current.lists[fieldsIn[i].options][report.fields[fieldsIn[i].id]])
                    )) &&
                    JSON.stringify( report.fields[fieldsIn[i].id] ) !== '{}'
                ) {
                    fieldsOut.push( fieldsIn[i] );
                }
            }
            return fieldsOut;
        }
        return _reportFieldsFilter;
    }

    activityListFilter.$inject = ["Site"];

    function activityListFilter(Site) {

        /**
         * @name _activityListFilter
         * @desc
         */
        function _activityListFilter(asset) {
            if (asset.length) {
                asset = asset[0];
            }
            var activitiesOut = [];
            for (var i = 0; i < Site.current.activities.length; i++) {
                if (Site.current.activities[i].okeys[0] === asset.okey) {
                    activitiesOut.push( Site.current.activities[i] );
                }
            }
            return activitiesOut;
        }
        return _activityListFilter;
    }

    function isLink() {
        /**
         * @name _isLink
         * @desc
         */
        function _isLink(s) {
            return ((s + '') || '').search( /(https?:\/\/.*)$/ );
        }
        return _isLink;
    }

})();
