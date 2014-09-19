(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('ReportController', ReportController);

    ReportController.$inject = ["$scope", "$routeParams", "$window", "$rootScope", "Smartgeo", "$location", "$http", "G3ME", "i18n", "ReportSynchronizer", "Asset", "Activity", "Report", "Site", "$timeout"];

    /**
     * @class ReportController
     * @desc Controlleur de la page de Compte rendu.
     *
     * @property {Object} report
     * @property {Boolean} sendingReport
     * @property {Boolean} isAndroid
     * @property {Array} assets
     * @property {RegExp} numberPattern
     * @property {Object} groupSelectOptions
     *
     * @private
     * @property {Boolean} comesFromIntent
     */

    function ReportController($scope, $routeParams, $window, $rootScope, Smartgeo, $location, $http, G3ME, i18n, ReportSynchronizer, Asset, Activity, Report, Site,$timeout) {

        var vm = this;

        vm.applyConsequences = applyConsequences;
        vm.cancel = cancel;
        vm.sendReport = sendReport;
        vm.bidouille = bidouille;

        vm.report = {};
        vm.sendingReport = false;
        vm.isAndroid = false;
        vm.assets = [];
        vm.numberPattern = /^(\d+([.]\d*)?|[.]\d+)$/;
        vm.groupSelectOptions = {};
        vm.containsUnfilledRequiredFields = containsUnfilledRequiredFields;

        var comesFromIntent = false;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {

            $rootScope.currentPage = "Saisie de compte-rendu";

            if(!checkInputParameters($routeParams)){
                return;
            }

            if(!Site.current()){
                Site.setCurrent($routeParams.site);
            }

            comesFromIntent = $rootScope.map_activity || $rootScope.report_activity;

            var assetsIds = $routeParams.assets.split(',');

            var missionId = $rootScope.report_mission || $routeParams.mission ;
            var isCall = false ;

            if(missionId && missionId.indexOf('call-') != -1){
                isCall = true ;
                missionId = missionId.substr(5) ;
            }

            vm.report = new Report(assetsIds, $routeParams.activity, missionId, isCall);

            for (var i = 0; i < assetsIds.length; i++) {
                vm.assets.push(new Asset(assetsIds[i], applyDefaultValues)); //TODO(@gulian): AssetCollectionFactory ?!
            }

            vm.groupSelectOptions = {
                allowClear: true,
                minimumInputLength: 2,
                query: select2QueryFunction
            };

            vm.report.activity.tabs[0].show = true;
        }

        /**
         * @name applyConsequences
         * @param {Number} srcId
         * @vm
         * @desc
         */
        function applyConsequences(srcId) {
            // Search for src field.
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
                        if (cond === false && targetField.type === 'O') {
                            vm.report.fields[act.target] = 'N';
                            vm.applyConsequences(act.target);
                        }

                        break;
                    case "require":
                        targetField.required = cond;
                        break;
                }
            }
        }

        /**
         * @name cancel
         * @vm
         * @desc
         */
        function cancel() {
            $location.path('map/' + $rootScope.site.id);
        }

        /**
         * @name sendReport
         * @vm
         * @desc
         */
        function sendReport() {
            vm.sendingReport = true;
            var report = angular.copy(vm.report), i ;
            for (i in report.fields) {
                if (report.fields[i] instanceof Date) {
                    report.fields[i] = pad(report.fields[i].getHours()) + ":" + pad(report.fields[i].getMinutes())
                }
                if (report.fields[i] && typeof report.fields[i] === "object" && report.fields[i].id && report.fields[i].text) {
                    report.fields[i] = report.fields[i].id;
                }
            }

            for (i = 0; i < report.ged.length; i++) {
                report.ged[i] = {
                    'content': getBase64Image(report.ged[i].content)
                };
            }

            for (i in report.overrides) {
                if (report.overrides[i]) {
                    report.fields[i] = report.overrides[i];
                }
            }

            report.activity = report.activity.id;

            ReportSynchronizer.synchronize(report, function() {
                vm.sendingReport = false;
                if (!comesFromIntent) {
                    endOfReport();
                }
            }, 5000)

            if (comesFromIntent) {
                endOfReport();
            }
        }

        /**
         * @name bidouille
         * @param {Event} event
         * @vm
         * @desc Olalalala ...
         */
        function bidouille(event) {
            document.querySelector('#mainview').firstChild.scrollTop = $(event.currentTarget).siblings('label')[0].offsetTop - 7;
            if (window.screen.height <= 640) {
                document.querySelector('.reportForm').style.paddingBottom = "280px";
            }
        }

        /**
         * @name pad
         * @param {Number} number
         * @desc
         */
        function pad(number) {
            return (number < 10) ? ('0' + number) : number;
        }

        /**
         * @name getList
         * @param {String} pkey
         * @param {String} okey
         * @desc
         */
        function getList(pkey, okey) {
            var mm = $rootScope.site.metamodel[okey];
            for (var i in mm.tabs) {
                for (var j in mm.tabs[i].fields) {
                    if (mm.tabs[i].fields[j].key === pkey) {
                        return mm.tabs[i].fields[j].options;
                    }
                }
            }
            return false;
        }

        /**
         * @name getValueFromAssets
         * @param {String} pkey
         * @param {String} okey
         * @desc
         */
        function getValueFromAssets(pkey, okey) {
            var rv = {},
                val;
            for (var i = 0, lim = vm.assets.length; i < lim; i++) {
                var a = vm.assets[i].attributes,
                    list = getList(pkey, okey);
                if (!a) {
                    break;
                }
                val = a[pkey];
                if (list && $rootScope.site.lists[list] && $rootScope.site.lists[list][val]) {
                    val = $rootScope.site.lists[list][val];
                }
                rv[vm.assets[i].id] = val;
            }
            return rv;
        }

        /**
         * @name applyDefaultValues
         * @desc
         */
        function applyDefaultValues() {
            var fields = vm.report.fields,
                def, i, field, date;

            for (var i in vm.report.activity._fields) {
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
                    d.setHours(0);
                    d.setMinutes(0);
                    fields[field.id] = d;
                } else if (!def) {
                    continue;
                } else if ('string' === typeof def) {
                    if (field.type === 'D' && def === '#TODAY#') {
                        date = new Date();
                        def = date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
                    }
                    fields[field.id] = def;
                    vm.report.roFields[field.id] = def;
                } else {
                    def = getValueFromAssets(def.pkey, vm.report.activity.okeys[0]);
                    vm.report.roFields[field.id] = formatFieldEntry(def);
                    vm.report.overrides[field.id] = '';
                    fields[field.id] = def;
                }
            }

            $scope.$digest();
        }

        /**
         * @name formatFieldEntry
         * @param {String|Array} val
         * @desc
         */
        function formatFieldEntry(val) {
            if ('string' === typeof val) {
                return val;
            }
            var str = [];
            for (var a in val) {
                if (val[a]) {
                    str.push(val[a]);
                }
            }
            return str.join(', ');
        }

        /**
         * @name endOfReport
         * @desc
         */
        function endOfReport() {
            if ($rootScope.report_url_redirect) {
                $rootScope.report_url_redirect = injectCallbackValues($rootScope.report_url_redirect) || $rootScope.report_url_redirect;
                if (window.SmartgeoChromium && SmartgeoChromium.redirect) {
                    SmartgeoChromium.redirect(decodeURI($rootScope.report_url_redirect));
                } else {
                    window.open($rootScope.report_url_redirect, "_blank");
                }
            }

            // TODO: Put all intents variables in something like $rootScope.intent.[map|report]_*
            //       It will be easier to reset context ($rootScope.intent=undefined)
            $rootScope.map_target = undefined;
            $rootScope.map_marker = undefined;
            $rootScope.map_activity = undefined;
            $rootScope.report_activity = undefined;
            $rootScope.report_mission = undefined;
            $rootScope.report_target = undefined;
            $rootScope.report_fields = undefined;
            $rootScope.report_url_redirect = undefined;

            $location.path('map/' + $rootScope.site.id);
            $scope.$apply();
        }

        /**
         * @name injectCallbackValues
         * @param {String} url
         * @desc
         */
        function injectCallbackValues(url) {
            var injectedValues;
            if (url.indexOf('[LABEL_INDEXED_FIELDS]') !== -1) {
                injectedValues = '';
                for (var field in vm.report.fields) {
                    if (vm.report.fields.hasOwnProperty(field)) {
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
                injectedValues = injectedValues.slice(0, injectedValues.length - 1);
                url = url.replace("[LABEL_INDEXED_FIELDS]", injectedValues);
            } else if (url.indexOf('[KEY_INDEXED_FIELDS]') !== -1) {
                injectedValues = '';
                for (var field_ in vm.report.fields) {
                    if (vm.report.fields.hasOwnProperty(field_)) {
                        injectedValues += 'fields[' + field_ + ']=' + vm.report.fields[field_] + '&';
                    }
                }
                injectedValues = injectedValues.slice(0, injectedValues.length - 1);
                url = url.replace("[KEY_INDEXED_FIELDS]", injectedValues);
            }
            return url;
        }

        /**
         * @name getBase64Image
         * @param {String} src
         * @desc TODO(@gulian): C'est pas vraiment sa place là ...
         */
        function getBase64Image(src) {
            var img = document.createElement("img");
            img.src = src;
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL("image/jpeg", 50);
            return dataURL;
        }



        /**
         * @name checkInputParameters
         * @param {Object} routeParams
         * @desc Vérification des paramètres d'entrée
         * @returns {Boolean} Retourne true si les paramètres obligatoires sont présents
         */
        function checkInputParameters(routeParams) {
            if(!routeParams.site){
                alertify.alert('Aucun site selectionné.');
                return false;
            } else if(!routeParams.activity){
                alertify.alert('Aucune activité selectionnée.');
                return false;
            } else if(!routeParams.assets){
                alertify.alert('Aucun patrimoine selectionné.');
                return false;
            }
            return true;
        }

        /**
         * @name sortFunction
         * @param {Object} a
         * @param {Object} b
         * @desc
         */
        function sortFunction(a, b) {
            return (a.text < b.text) ? -1 : 1;
        }


        /**
         * @name containsUnfilledRequiredFields
         * @desc
         */
        function containsUnfilledRequiredFields(){
            for (var i in vm.report.activity._fields) {
                var field = vm.report.activity._fields[i];
                if(field.required && !vm.report.fields[field.id]){
                    return true;
                }
            }
            return false ;
        }

        /**
         * @name select2QueryFunction
         * @param {Object} query
         * @desc
         */
        function select2QueryFunction(query) {
            var fieldOptions = vm.report.activity._fields[query.element.data('field')].options,
                results = [],
                o;
            query.term = query.term.toLowerCase();
            for (var k = 0; k < fieldOptions.length && results.length < 50; k++) {
                o = fieldOptions[k];
                if (o.label.toLowerCase().indexOf(query.term) !== -1) {
                    results.push({
                        id: o.value,
                        text: o.label
                    });
                }
            }
            results.sort(sortFunction);
            return query.callback({
                results: results
            });
        }
    }

})();