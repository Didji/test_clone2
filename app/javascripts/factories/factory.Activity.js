(function() {

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
        Activity.findOne = function(id) {
            var site = Site.current();
            if (!site.activities._byId) {
                site.activities._byId = {};
                for (var i = 0; i < site.activities.length; i++) {
                    site.activities._byId[site.activities[i].id] = site.activities[i];
                }
            }
            var activity = site.activities._byId[id] ;
            if (!activity._fields) {
                activity._fields = {};
                for (var i = 0, numTabs = activity.tabs.length, tab; i < numTabs; i++) {
                    tab = activity.tabs[i];
                    for (var j = 0, numFields = tab.fields.length; j < numFields; j++) {
                        if(tab.fields[j].required){
                            tab.required = true ;
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