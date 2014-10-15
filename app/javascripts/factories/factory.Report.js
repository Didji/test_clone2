(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Report', ReportFactory);

    ReportFactory.$inject = ["Smartgeo", "Activity"];


    function ReportFactory(Smartgeo, Activity) {

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
        function Report(assets, activity, mission, isCall) {
            this.assets = assets ;
            this.activity = Activity.findOne(activity) ;
            this.mission = 1*mission ;
            this.site = window.SMARTGEO_CURRENT_SITE.label ;
            this.fields = {};
            this.ged = [];
            this.uuid = Smartgeo.uuid();
            this.timestamp = new Date().getTime();
            this.isCall = isCall ;
        }

        Report.prototype.roFields = {};
        Report.prototype.overrides = {};

        /**
         * @name removeGedItem
         * @param {Number} i
         * @desc
         */
        Report.prototype.removeGedItem = function(i) {
            this.ged.splice(i, 1);
        };

        return Report;
    }

})();
