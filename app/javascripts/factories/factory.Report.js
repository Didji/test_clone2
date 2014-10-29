(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Report', ReportFactory);

    ReportFactory.$inject = ["Smartgeo", "Activity", "Site"];


    function ReportFactory(Smartgeo, Activity, Site) {

        /**
         * @class ReportFactory
         * @desc Factory de la classe Report
         *
         * @property {Array} assets
         * @property {Object} fields
         * @property {Object} roFields
         * @property {Object} overrides
         * @property {Array} ged
         * @property {Object} site
         * @property {Number} mission
         * @property {Activity} activity
         * @property {String} uuid
         * @property {Date} timestamp
         */
        function Report(assets, activity, mission) {
            var reportTargets = [],
                isCall = false,
                reportLatLng, match;

            if ((match = assets.match(/^(\d+);([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/))) {
                reportTargets = match[0];
            } else if ((match = assets.match(/^([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/))) {
                reportLatLng = match[0] + ',' + match[1];
            } else {
                reportTargets = assets.split(',');
            }

            if (mission && mission.indexOf('call-') !== -1) {
                isCall = true;
                mission = mission.substr(5);
            }

            this.assets = reportTargets;

            this.activity = Activity.findOne(activity);
            this.activity.tabs[0].show = true;

            this.mission = 1 * mission;
            this.site = Site.current.label;
            this.fields = {};
            this.ged = [];
            this.uuid = Smartgeo.uuid();
            this.timestamp = new Date().getTime();
            this.isCall = isCall;
            this.latlng = reportLatLng;
        }

        Report.prototype.roFields = {};
        Report.prototype.overrides = {};

        /**
         * @name removeGedItem
         * @param {Number} i
         * @desc Supprime la GED d'un object Report
         */
        Report.prototype.removeGedItem = function (i) {
            this.ged.splice(i, 1);
        };

        return Report;
    }

})();
