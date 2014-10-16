(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Activity', ActivityFactory);

    ActivityFactory.$inject = ["Site"];


    function ActivityFactory(Site) {

        /**
         * @class ActivityFactory
         * @desc Factory de la classe Activity
         */

        var Activity = {}

        /**
         * @name findOne
         * @desc
         */
        Activity.findOne = function (id) {
            var i, numTabs, tab;
            if (!Site.current.activities._byId) {
                Site.current.activities._byId = {};
                for (i = 0; i < Site.current.activities.length; i++) {
                    Site.current.activities._byId[Site.current.activities[i].id] = Site.current.activities[i];
                }
            }
            var activity = Site.current.activities._byId[id];
            if (!activity._fields) {
                activity._fields = {};
                for (i = 0, numTabs = activity.tabs.length, tab; i < numTabs; i++) {
                    tab = activity.tabs[i];
                    for (var j = 0, numFields = tab.fields.length; j < numFields; j++) {
                        if (tab.fields[j].required) {
                            tab.required = true;
                        }
                        tab.fields[j].isconsequence = (tab.fields[j].visible === false);
                        activity._fields[tab.fields[j].id] = tab.fields[j];
                    }
                }
            }
            return angular.copy(activity);
        };

        return Activity;
    }

})();
