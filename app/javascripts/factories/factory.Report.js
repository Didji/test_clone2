(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Report', ReportFactory );

    ReportFactory.$inject = ["Activity", "Site", "i18n"];


    function ReportFactory(Activity, Site, i18n) {

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
                reportLatLng, match;
            if ( (match = ("" + assets).match( /^(\d+);(-?\d+.\d+),(-?\d+.\d+)$/ )) ) {
                reportTargets = match[0];
            } else if ( (match = ("" + assets).match( /^([-+]?\d+.?\d+),([-+]?\d+.?\d+)$/ )) ) {
                reportLatLng = match[0];
            } else if ( "string" === typeof assets ) {
                reportTargets = assets.split( '!' );
            } else {
                reportTargets = assets ;
            }
            if (mission && ("" + mission).indexOf( 'call-' ) !== -1) {
                this.isCall = true;
                mission = mission.substr( 5 );
            }

            this.assets = reportTargets;

            this.activity = Activity.findOne( activity );
            this.activity.tabs[0].show = true;

            if (mission) {
                this.mission = +mission;
            }
            this.site = Site.current.label;
            this.fields = {};
            this.ged = [];
            this.version = window.Smartgeo._SMARTGEO_MOBILE_VERSION ;
            this.uuid = window.uuid();
            this.timestamp = new Date().getTime();
       /*    if (reportLatLng) {
                this.latlng = reportLatLng;
            }*/
        }

        Report.prototype.getLabel = function() {
            return i18n.get( "_REPORT_REPORT" );
        };

        Report.prototype.getDescription = function() {
            return (Site.current.activities._byId["" + this.activity] || Site.current.activities._byId["" + this.activity.id]).label + ' (' + this.site + ')';
        };

        Report.prototype.roFields = {};
        Report.prototype.overrides = {};

        /**
         * @name removeGedItem
         * @param {Number} i
         * @desc Supprime la GED d'un object Report
         */
        Report.prototype.removeGedItem = function(i) {
            this.ged.splice( i, 1 );
        };

        return Report;
    }

})();
