(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ReportController', ReportController );

    ReportController.$inject = ["$scope", "$routeParams", "$rootScope", "$location", "Asset", "Site", "Report", "Storage", "Synchronizator", "Utils","i18n"];

    /**
     * @class ReportController
     * @desc Controlleur de la page de Compte rendu.
     *
     * @property {Object} report
     * @property {Boolean} sendingReport
     * @property {Boolean} isAndroid
     * @property {Array} assets
     * @property {RegExp} numberPattern
     *
     * @private
     * @property {Object} intent
     */

    function ReportController($scope, $routeParams, $rootScope, $location, Asset, Site, Report, Storage, Synchronizator, Utils,i18n) {

        var vm = this;

        vm.applyConsequences = applyConsequences;
        vm.cancel = cancel;
        vm.sendReport = sendReport;

        vm.report = {};
        vm.sendingReport = false;
        vm.isAndroid = navigator.userAgent.match( /Android/i );
        vm.isIOS = navigator.userAgent.match( /iP(od|hone|ad)/i );
        vm.assets = [];
        vm.numberPattern = /^(\d+([.]\d*)?|[.]\d+)$/;
        vm.containsUnfilledRequiredFields = containsUnfilledRequiredFields;
        vm._MAX_MEDIA_PER_REPORT = 3 ;


        var intent = Storage.get( 'intent' ) || {};

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            $rootScope.currentPage = "Saisie de compte-rendu";

            if (!checkInputParameters( $routeParams )) {
                return;
            }

            bidouille();

            if (!isNaN( +$routeParams.assets )) {
                $routeParams.assets = [+$routeParams.assets];
            }

            vm.report = new Report( $routeParams.assets, $routeParams.activity, $routeParams.mission );
            applyDefaultValues();
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            for (var i = 0; i < vm.report.assets.length; i++) {
                vm.assets.push( new Asset( vm.report.assets[i], applyDefaultValues ) );
            }
            setTimeout( function() {
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            }, 1000 );
        }

        /**
         * @name applyConsequences
         * @param {Number} srcId
         * @vm
         * @desc Applique les conséquences entre champs
         */
        function applyConsequences(srcId) {
            var field = vm.report.activity._fields[srcId],
                targetField, i, lim, act,
                cond;

            if (!field.actions) {
                return false;
            }

            for (i = 0, lim = field.actions.length; i < lim; i++) {
                act = field.actions[i];
                targetField = vm.report.activity._fields[act.target];
                if (!targetField) {
                    continue;
                }

                cond = (vm.report.fields[srcId] === act.condition);
                switch (act.type) {
                    case "show":
                        targetField.visible = cond;
                        // Si targetField est une case à cocher, elle a peut-être
                        // aussi des conséquences. Si une case à cocher devient invisible,
                        // il faut qu'on la décoche et qu'on applique ses conséquences.
                        if (!!!cond && targetField.type === 'O') {
                            vm.report.fields[act.target] = 'N';
                            vm.applyConsequences( act.target );
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
         * @name cancel
         * @vm
         * @desc Annule le compte rendu
         */
        function cancel() {
            alertify.confirm(i18n.get( '_CANCEL_REPORT_CREATION', Site.current.label ),function(yes){
                if(yes)
                {
                    $location.path( 'map/' + Site.current.id );
                    $scope.$apply();
                }
            })

        }

        /**
         * @name sendReport
         * @vm
         * @desc Envoie le compte rendu
         */
        function sendReport() {
            vm.sendingReport = true;
            Synchronizator.addNew( prepareReport( vm.report ) );
            endOfReport();
        }

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
         * @name bidouille
         * @param {Event} event
         * @desc Olalalala ... A remplacer par un ng-blur ?
         */
        function bidouille() {
            angular.element( document.getElementsByClassName( 'reportForm' )[0] ).on( 'click', "input:not(input[type=checkbox]), select, label, .chosen-container", function() {
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
                angular.element( 'html, body' ).animate( {
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
            for (var i = 0, lim = vm.assets.length; i < lim; i++) {
                var a = vm.assets[i].attributes,
                    list = Site.getList( pkey, okey );
                if (!a) {
                    break;
                }
                val = a[pkey];
                if (list && Site.current.lists[list] && Site.current.lists[list][val]) {
                    val = Site.current.lists[list][val];
                }
                rv[vm.assets[i].id] = val;
            }
            return rv;
        }

        /**
         * @name applyDefaultValues
         * @desc Applique les valeurs par defaut
         */
        function applyDefaultValues() {
            var fields = vm.report.fields,
                def, i, field, date;

            for (i in vm.report.activity._fields) {
                field = vm.report.activity._fields[i];
                def = field['default'];

                // Par priorité sur les valeurs par défaut, on applique les valeurs
                // fixées dans le scope par les intents.
                if (vm['report_fields[' + field.label + ']']) {
                    def = vm['report_fields[' + field.label + ']'];
                }
                if (vm['report_fields[$' + field.id + ']']) {
                    def = vm['report_fields[$' + field.id + ']'];
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
                        vm.report.fields[field.id] = new Date( def );
                    } else if (field.type === 'T' && def === '#NOW#') {
                        var d = new Date();
                        fields[field.id] = d;
                    } else {
                        fields[field.id] = def;
                        vm.report.fields[field.id] = def;
                        vm.report.roFields[field.id] = def;
                    }
                } else {
                    def = getValueFromAssets( def.pkey, vm.report.activity.okeys[0] );
                    vm.report.roFields[field.id] = formatFieldEntry( def );
                    vm.report.overrides[field.id] = '';
                    fields[field.id] = def;
                }
            }
            if (!$scope.$$phase) {
                $scope.$digest();
            }
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
         * @name endOfReport
         * @desc Procédure de fin de compte rendu
         */
        function endOfReport() {
            if (intent.report_url_redirect) {
                intent.report_url_redirect = injectCallbackValues( intent.report_url_redirect ) || intent.report_url_redirect;
                if (window.SmartgeoChromium && SmartgeoChromium.redirect) {
                    SmartgeoChromium.redirect( decodeURI( intent.report_url_redirect ) );
                } else {
                    window.open( intent.report_url_redirect, "_blank" );
                }
            }
            Storage.remove( 'intent' );
            $location.path( 'map/' + Site.current.id );
        }

        /**
         * @name injectCallbackValues
         * @param {String} url
         * @desc Injecte les valeurs de retour pour les intents
         */
        function injectCallbackValues(url) {
            var injectedValues;
            if (url.indexOf( '[LABEL_INDEXED_FIELDS]' ) !== -1) {
                injectedValues = '';
                for (var field in vm.report.fields) {
                    if (vm.report.fields.hasOwnProperty( field )) {
                        var val = vm.report.fields[field];
                        // /!\ UGLY ALERT WORKS WITH ONLY ONE ASSETS
                        if (typeof val === 'object') {
                            for (var j in val) {
                                val = val[j];
                                break;
                            }
                        }
                        injectedValues += 'fields[' + vm.report.activity._fields[field].label + ']=' + val + '&';
                    }
                }
                injectedValues = injectedValues.slice( 0, injectedValues.length - 1 );
                url = url.replace( "[LABEL_INDEXED_FIELDS]", injectedValues );
            } else if (url.indexOf( '[KEY_INDEXED_FIELDS]' ) !== -1) {
                injectedValues = '';
                for (var field_ in vm.report.fields) {
                    if (vm.report.fields.hasOwnProperty( field_ )) {
                        injectedValues += 'fields[' + field_ + ']=' + vm.report.fields[field_] + '&';
                    }
                }
                injectedValues = injectedValues.slice( 0, injectedValues.length - 1 );
                url = url.replace( "[KEY_INDEXED_FIELDS]", injectedValues );
            }
            return url;
        }

        /**
         * @name checkInputParameters
         * @param {Object} routeParams
         * @desc Vérification des paramètres d'entrée
         * @returns {Boolean} Retourne true si les paramètres obligatoires sont présents
         */
        function checkInputParameters(routeParams) {
            if (!routeParams.site) {
                alertify.alert( 'Aucun site selectionné.' );
                return false;
            } else if (!routeParams.activity) {
                alertify.alert( 'Aucune activité selectionnée.' );
                return false;
            } else if (!routeParams.assets) {
                alertify.alert( 'Aucun patrimoine selectionné.' );
                return false;
            }
            return true;
        }

        /**
         * @name containsUnfilledRequiredFields
         * @desc Detecte si un onglet possède un champs requis
         */
        function containsUnfilledRequiredFields() {
            for (var i in vm.report.activity._fields) {
                var field = vm.report.activity._fields[i];
                if (field.required && !vm.report.fields[field.id]) {
                    return true;
                }
            }
            return false;
        }

    }

})();
