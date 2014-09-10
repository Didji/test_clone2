(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('Report', ReportFactory);

    ReportFactory.$inject = ["G3ME", "Icon", "Marker", "SQLite", "$rootScope", "Smartgeo", "$http", "Activity"];


    function ReportFactory(G3ME, Icon, Marker, SQLite, $rootScope, Smartgeo, $http, Activity) {

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
            this.assets = assets ;
            this.activity = Activity.findOne(activity) ;
            this.mission = mission ;
            this.site = $rootScope.site.label ;
        }

        Report.prototype.assets = [];
        Report.prototype.fields = {};
        Report.prototype.roFields = {};
        Report.prototype.overrides = {};
        Report.prototype.ged = [];
        Report.prototype.site = false;
        Report.prototype.mission = null;
        Report.prototype.activity = null;
        Report.prototype.uuid = Smartgeo.uuid();
        Report.prototype.timestamp = new Date().getTime();

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
