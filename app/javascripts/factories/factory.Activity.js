(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Activity', ActivityFactory);

    ActivityFactory.$inject = ["$rootScope"];


    function ActivityFactory($rootScope) {

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
            if (!$rootScope.site.activities._byId) {
                $rootScope.site.activities._byId = {};
                for (var i = 0; i < $rootScope.site.activities.length; i++) {
                    $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
                }
            }
            var activity = $rootScope.site.activities._byId[id] ;
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