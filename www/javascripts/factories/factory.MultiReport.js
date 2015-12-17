/**
 *
 *  Devrait disparaitre avec le refactoring des reports et des multi-reports
 *
 */
(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'MultiReport', MultiReportFactory );

    MultiReportFactory.$inject = ["$compile", "$rootScope", "G3ME", "Asset", "Report", "Synchronizator", "Activity", "Site", "Storage"];


    function MultiReportFactory($compile, $rootScope, G3ME, Asset, Report, Synchronizator, Activity, Site, Storage) {

        /**
         * @class MultiReportFactory
         * @desc Factory de la classe MultiReport
         */

        var intent;
        var LONG_TAP_TIMER = null;

        function MultiReport(intent_) {
            intent = intent_;
            intent.multi_report_activity = Activity.findOne( intent.multi_report_activity );
            if (!intent.multi_report_activity) {
                return alertify.alert( "L'activité n'existe pas." );
            } else if (intent.multi_report_activity.type !== "multi_assets_tour" || !intent.multi_report_activity.multi_assets_tour) {
                return alertify.alert( "L'activité fournie n'est pas compatible. Le type est différent de 'multi_assets_tour'" );
            } else if (intent.multi_report_activity.multi_assets_tour.switch_field === null || intent.multi_report_activity.multi_assets_tour.switch_field === undefined) {
                return alertify.alert( "L'activité fournie n'est pas compatible ou erroné." );
            }
            intent.multi_report_field = intent.multi_report_activity._fields[+intent.multi_report_activity.multi_assets_tour.switch_field];
            intent.multi_report_target = intent.multi_report_target.split( ',' );
            Asset.findAssetsByGuids( intent.multi_report_target, MultiReport.createMarkers );
            MultiReport.createExitControl();
        }


        /**
         * @name createExitControl
         * @desc Crée le control de sortie de multi report
         */
        MultiReport.createExitControl = function() {
            var control = L.Control.extend( {
                onAdd: function() {
                    var container = L.DomUtil.create( 'div', 'bottom-bar' );
                    $( container )
                        .html( '<a href="#">' + (intent.multi_report_outmsg || "Quitter") + '</a>' )
                        .on( 'click', MultiReport.exitClickHandler );
                    return container;
                }
            } );
            G3ME.map.addControl( new control() );
        };

        /**
         * @name MultiReport.exitClickHandler
         * @desc Handler de fin du mode MultiReport
         * @param {Event} e
         */
        MultiReport.exitClickHandler = function(e) {
            e.preventDefault();

            intent.multi_report_reports = {};
            intent.multi_report_assets_id = [];

            var asset, assetid, reportValue, redirect;

            for (assetid in intent.multi_report_target) {
                asset = intent.multi_report_target[assetid];
                if (asset.currentState === 0) {
                    continue;
                }
                intent.multi_report_assets_id.push( asset.id );
                if (!intent.multi_report_reports[intent.multi_report_field.options[asset.currentState].value]) {
                    intent.multi_report_reports[intent.multi_report_field.options[asset.currentState].value] = new Report( asset.id, intent.multi_report_activity.id, intent.multi_report_mission );
                    intent.multi_report_reports[intent.multi_report_field.options[asset.currentState].value].fields[intent.multi_report_field.id] = intent.multi_report_field.options[asset.currentState].value;
                } else {
                    intent.multi_report_reports[intent.multi_report_field.options[asset.currentState].value].assets.push( asset.id );
                }
            }
            for (reportValue in intent.multi_report_reports) {
                if (angular.isObject(intent.multi_report_reports[reportValue].activity)) {
                    intent.multi_report_reports[reportValue].activity = intent.multi_report_reports[reportValue].activity.id;
                }
                Synchronizator.addNew( intent.multi_report_reports[reportValue] );
            }
            if (intent.multi_report_redirect) {
                redirect = intent.multi_report_redirect.replace( "[DONE_ASSETS]", intent.multi_report_assets_id.join( ',' ) );

                //TODO: pour ce dev spé Veolia, gérer le passage en 2.0/full web view en remplacant l'appel suivant à Chromium:
                SmartgeoChromium.redirect( decodeURI( redirect ) );
            }
            Storage.remove( 'intent' );
            return false;
        };

        /**
         * @name createMarkers
         * @desc Crée les marqueurs qui changent d'état
         */
        MultiReport.createMarkers = function(assets) {
            intent.multi_report_target = assets;
            intent.multi_report_icons = {};
            for (var state in intent.multi_report_field.options) {
                var icon = intent.multi_report_field.options[state].icon;
                intent.multi_report_icons[state] = L.icon( {
                    iconUrl: icon.content,
                    iconSize: [icon.width, icon.height],
                    iconAnchor: [icon.width / 2, icon.height / 2]
                } );
            }
            intent.multi_report_target.forEach( function(asset) {
                asset.currentState = 0;
                L.marker( Asset.getCenter( asset ), {
                    icon: intent.multi_report_icons[asset.currentState]
                } ).on( 'click', function() {
                    this.setIcon( intent.multi_report_icons[++asset.currentState % intent.multi_report_field.options.length] );
                } ).on( 'contextmenu', function() {
                    var e = $compile(angular.element('<div ng-include="partials/veolia.html"></div>'))($rootScope.$new());
                    this.bindPopup(e[0]);
                    console.log(intent.multi_report_activity.tabs[0].label);
                    console.log(intent.multi_report_activity.tabs);
                } ).addTo( G3ME.map );
            } );
        };

        MultiReport.handleLongTap = function() {
            //alert('long tap');
        };

        return MultiReport;
    }

})();
