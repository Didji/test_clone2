(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .directive( 'multiReport', multiReportDirective );

    multiReportDirective.$inject = ["G3ME", "Asset", "Report", "Synchronizator", "Activity", "Site", "Storage", "i18n", "Utils"];

    /**
     * @desc Directive pour l'internationalisation
     * @example <multiReport>_AUTH_REMEMBER_PASSWORD_</multiReport>
     * @TODO: Factoriser dans une seule directive report et multireport
     */

    function multiReportDirective(G3ME, Asset, Report, Synchronizator, Activity, Site, Storage, i18n, Utils) {
        return {
            restrict: 'E',
            scope: {
                'intent': '='
            },
            templateUrl: 'javascripts/directives/template/multi.report.html',
            link: link
        };

        var reports;

        function link(scope, element, attrs, controller) {
            if (!scope.intent) {
                return false;
            }

            reports = {};

            scope.cancel = cancel;
            scope.save = save;
            scope.applyConsequences = applyConsequences;

            scope.report = null;
            scope.assets = [];
            scope.isAndroid = navigator.userAgent.match( /Android/i );
            scope.isIOS = navigator.userAgent.match( /iP(od|hone|ad)/i );
            scope.numberPattern = /^(\d+([.]\d*)?|[.]\d+)$/;

            scope.intent.multi_report_activity = Activity.findOne( scope.intent.multi_report_activity );
            if (!scope.intent.multi_report_activity) {
                return alertify.alert( "L'activité n'existe pas." );
            } else if (scope.intent.multi_report_activity.type !== "multi_assets_tour" || !scope.intent.multi_report_activity.multi_assets_tour) {
                return alertify.alert( "L'activité fournie n'est pas compatible. Le type est différent de 'multi_assets_tour'" );
            } else if (scope.intent.multi_report_activity.multi_assets_tour.switch_field === null || scope.intent.multi_report_activity.multi_assets_tour.switch_field === undefined) {
                return alertify.alert( "L'activité fournie n'est pas compatible ou erroné." );
            }
            scope.intent.multi_report_field = scope.intent.multi_report_activity._fields[+scope.intent.multi_report_activity.multi_assets_tour.switch_field];
            scope.intent.multi_report_target = scope.intent.multi_report_target.split( ',' );
            Asset.findAssetsByGuids( scope.intent.multi_report_target, createMarkers );
            createExitControl();

            /**
             * @name createExitControl
             * @desc Crée le control de sortie de multi report
             */
            function createExitControl() {
                var control = L.Control.extend( {
                    onAdd: function() {
                        var container = L.DomUtil.create( 'div', 'bottom-bar' );
                        $( container )
                            .html( '<a href="#">' + (scope.intent.multi_report_outmsg || "Quitter") + '</a>' )
                            .on( 'click', exitClickHandler );
                        return container;
                    }
                } );
                G3ME.map.addControl( new control() );
            };

            /**
             * @name applyConsequences
             * @param {Number} srcId
             * @scope
             * @desc Applique les conséquences entre champs
             */
            function applyConsequences(srcId) {
                var field = scope.report.activity._fields[srcId],
                    targetField, i, lim, act,
                    cond;

                if (!field.actions) {
                    return false;
                }

                for (i = 0, lim = field.actions.length; i < lim; i++) {
                    act = field.actions[i];
                    targetField = scope.report.activity._fields[act.target];
                    if (!targetField) {
                        continue;
                    }

                    cond = (scope.report.fields[srcId] === act.condition);
                    switch (act.type) {
                        case "show":
                            targetField.visible = cond;
                            // Si targetField est une case à cocher, elle a peut-être
                            // aussi des conséquences. Si une case à cocher devient invisible,
                            // il faut qu'on la décoche et qu'on applique ses conséquences.
                            if (!!!cond && targetField.type === 'O') {
                                scope.report.fields[act.target] = 'N';
                                scope.applyConsequences( act.target );
                            }
                            break;
                        case "require":
                            targetField.required = cond;
                            break;
                        default:
                            targetField.required = !!targetField.required;
                    }
                }
            }

            /**
             * @name applyDefaultValues
             * @desc Applique les valeurs par defaut
             */
            function applyDefaultValues() {
                var fields = scope.report.fields,
                    def, i, field, date;
                for (i in scope.report.activity._fields) {
                    field = scope.report.activity._fields[i];
                    def = field['default'];

                    // Par priorité sur les valeurs par défaut, on applique les valeurs
                    // fixées dans le scope par les intents.
                    if (scope.intent['report_fields[' + field.label + ']']) {
                        def = scope.intent['report_fields[' + field.label + ']'];
                    }
                    if (scope.intent['report_fields[$' + field.id + ']']) {
                        def = scope.intent['report_fields[$' + field.id + ']'];
                    }

                    if (field.type === 'T' && !def) {
                        var d = new Date();
                        d.setHours( 0 );
                        d.setMinutes( 0 );
                        fields[field.id] = d;
                    } else if (!def) {
                        continue;
                    } else if ('string' === typeof def) {
                        if (field.type === 'D' && def === '#TODAY#') {
                            date = new Date();
                            def = date.getUTCFullYear() + '-' + Utils.pad( date.getUTCMonth() + 1 ) + '-' + Utils.pad( date.getUTCDate() );
                            fields[field.id] = new Date( def );
                            scope.report.fields[field.id] = new Date( def );
                        } else if (field.type === 'T' && def === '#NOW#') {
                            var d = new Date();
                            fields[field.id] = d;
                        } else {
                            fields[field.id] = def;
                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = def;
                        }
                    } else {
                        def = getValueFromAssets( def.pkey, scope.report.activity.okeys[0] );
                        scope.report.roFields[field.id] = formatFieldEntry( def );
                        scope.report.overrides[field.id] = '';
                        fields[field.id] = def;
                    }
                }
                if (!scope.$$phase) {
                    scope.$digest();
                }
            }

            /**
             * @name bidouille
             * @param {Event} event
             * @desc Olalalala ... A remplacer par un ng-blur ?
             */
            function bidouille() {
                angular.element( document.getElementsByClassName( 'js-report-form' )[0] ).on( 'click', "input:not(input[type=checkbox]), select, label, .chosen-container", function() {
                    var elt;
                    if (angular.element( this ).prop( 'tagName' ) !== "label") {
                        elt = angular.element( this );
                    } else if (!angular.element( this ).siblings( 'label' ).length) {
                        elt = angular.element( this );
                    } else {
                        elt = angular.element( this ).siblings( 'label' );
                    }
                    if (!elt.offset().top) {
                        return;
                    }
                    angular.element( '.modal' ).animate( {
                        scrollTop: elt.offset().top - 10
                    }, 250 );
                    elt = null;
                } );

            }

            /**
             * @name getValueFromAssets
             * @param {String} pkey
             * @param {String} okey
             * @desc Retourne la valeur d'un attribut d'un objet
             */
            function getValueFromAssets(pkey, okey) {
                var rv = {},
                    val;
                for (var i = 0, lim = scope.assets.length; i < lim; i++) {
                    var a = scope.assets[i].attributes,
                        list = Site.getList( pkey, okey );
                    if (!a) {
                        break;
                    }
                    val = a[pkey];
                    if (list && Site.current.lists[list] && Site.current.lists[list][val]) {
                        val = Site.current.lists[list][val];
                    }
                    rv[scope.assets[i].id] = val;
                }
                return rv;
            }

            /**
             * @name formatFieldEntry
             * @param {String|Array} val
             * @desc Formatte le champs
             */
            function formatFieldEntry(val) {
                if ('string' === typeof val) {
                    return val;
                }
                var str = [];
                for (var a in val) {
                    if (val[a]) {
                        str.push( val[a] );
                    }
                }
                return str.join( ', ' );
            }

            /**
             * @name exitClickHandler
             * @desc Handler de fin du mode          * @param {Event} e
             */
            function exitClickHandler(e) {
                e.preventDefault();

                scope.intent.multi_report_assets_id = [];

                var asset, assetid, redirect;

                for (assetid in scope.intent.multi_report_target) {
                    asset = scope.intent.multi_report_target[assetid];
                    if (asset.currentState === 0) {
                        continue;
                    }

                    if ( !reports[+asset.id] ) {
                        reports[+asset.id] = new Report( asset.id, scope.intent.multi_report_activity.id, scope.intent.multi_report_mission );
                    }

                    reports[+asset.id].fields[scope.intent.multi_report_field.id] = scope.intent.multi_report_field.options[asset.currentState].value;

                    scope.intent.multi_report_assets_id.push( asset.id );

                    Synchronizator.addNew( prepareReport( reports[+asset.id] ) );
                }

                if (scope.intent.multi_report_redirect && window.SmartgeoChromium && SmartgeoChromium.redirect) {
                    redirect = scope.intent.multi_report_redirect.replace( "[DONE_ASSETS]", scope.intent.multi_report_assets_id.join( ',' ) );
                    SmartgeoChromium.redirect( decodeURI( redirect ) );
                }
                Storage.remove( 'intent' );
                return false;
            };

            /**
             * @name prepareReport
             * @desc Prepare le compte rendu avant de l'envoyer
             * @param {Report} reportin Le compte rendu a préparer
             * @returns {Object}
             */
            function prepareReport(reportin) {
                var report = angular.copy( reportin ),
                    i;
                for (i in report.fields) {
                    if (report.fields[i] instanceof Date && report.activity._fields[i].type === "T") {
                        report.fields[i] = Utils.pad( report.fields[i].getHours() ) + ":" + Utils.pad( report.fields[i].getMinutes() );
                    }
                    if (report.fields[i] instanceof Date && report.activity._fields[i].type === "D") {
                        report.fields[i] = report.fields[i].getFullYear() + "-" + Utils.pad( report.fields[i].getMonth() + 1 ) + "-" + Utils.pad( report.fields[i].getDate() );
                    }
                    if (report.fields[i] && typeof report.fields[i] === "object" && report.fields[i].id && report.fields[i].text) {
                        report.fields[i] = report.fields[i].id;
                    }
                }
                for (i = 0; i < report.ged.length; i++) {
                    report.ged[i] = {
                        'content': Utils.getBase64Image( report.ged[i].content )
                    };
                }
                for (i in report.overrides) {
                    if (report.overrides[i]) {
                        report.fields[i] = report.overrides[i];
                    }
                }
                report.activity = report.activity.id;
                report.version = Smartgeo._SMARTGEO_MOBILE_VERSION;
                return report;
            }

            /**
             * @name createMarkers
             * @desc Crée les marqueurs qui changent d'état
             */
            function createMarkers(assets) {
                scope.intent.multi_report_target = assets;
                scope.intent.multi_report_icons = {};
                for (var state in scope.intent.multi_report_field.options) {
                    var icon = scope.intent.multi_report_field.options[state].icon;
                    scope.intent.multi_report_icons[state] = L.icon( {
                        iconUrl: icon.content,
                        iconSize: [icon.width, icon.height],
                        iconAnchor: [icon.width / 2, icon.height / 2]
                    } );
                }
                scope.intent.multi_report_target.forEach( function(asset) {
                    asset.currentState = 0;
                    L.marker( Asset.getCenter( asset ), {
                        icon: scope.intent.multi_report_icons[asset.currentState]
                    } ).on( 'click', function() {
                        asset.currentState = ++asset.currentState % scope.intent.multi_report_field.options.length;
                        this.setIcon( scope.intent.multi_report_icons[asset.currentState] );
                    } ).on( 'contextmenu', function() {
                        var field;
                        scope.report = reports[ asset.id ] || new Report( asset.id, scope.intent.multi_report_activity.id, scope.intent.multi_report_mission );
                        for ( var i in scope.report.activity._fields ) {
                            field = scope.report.activity._fields[ i ];
                            scope.report.fields[ field.id ] = scope.report.fields[ field.id ] || '';
                        }
                        if (!scope.$$phase) {
                            scope.$apply();
                        }
                        for (var i = 0; i < scope.report.assets.length; i++) {
                            scope.assets.push( new Asset( scope.report.assets[i], applyDefaultValues ) );
                        }
                        applyDefaultValues();
                        bidouille();

                        $('#multireport').modal( 'toggle' );
                    } ).addTo( G3ME.map );
                } );
            };

            /**
             * @name save
             * @return Sauvegarde le rapport courant en attendant la synchro
             */
            function save() {
                reports[ scope.report.assets[0] ] = scope.report;
                close();
            }

            /**
             * @name cancel
             * @return Annule la saisie en cours
             */
            function cancel() {
                if ( !scope.reportForm.$pristine ) {
                    alertify.confirm( i18n.get( '_CANCEL_REPORT_CREATION' ), function( yes ) {
                        if ( yes ) {
                            return close();
                        }
                    } );
                } else {
                    return close();
                }
            }

            /**
             * @name close
             * @return Ferme la fenêtre
             */
            function close() {
                scope.report = null;
                scope.assets = [];
                scope.reportForm.$setPristine();
                $( '#multireport' ).modal( 'toggle' );
            }
        }

    }

})();
