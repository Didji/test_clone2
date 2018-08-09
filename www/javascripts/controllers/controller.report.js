(function() {
    "use strict";

    angular.module("smartgeomobile").controller("ReportController", ReportController);

    ReportController.$inject = [
        "$scope",
        "$routeParams",
        "$rootScope",
        "$location",
        "Asset",
        "Site",
        "Report",
        "Storage",
        "Synchronizator",
        "Utils",
        "i18n",
        "Intents",
        "GPS",
        "Right"
    ];

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

    function ReportController(
        $scope,
        $routeParams,
        $rootScope,
        $location,
        Asset,
        Site,
        Report,
        Storage,
        Synchronizator,
        Utils,
        i18n,
        Intents,
        GPS,
        Right
    ) {
        var vm = this;

        vm.applyConsequences = applyConsequences;
        vm.cancel = cancel;
        vm.sendReport = sendReport;

        vm.report = {};
        vm.sendingReport = false;
        vm.isAndroid = navigator.userAgent.match(/Android/i);
        vm.isIOS = navigator.userAgent.match(/iP(od|hone|ad)/i);
        vm.assets = [];
        vm.numberPattern = /^(\d+([.]\d*)?|[.]\d+)$/;
        vm._MAX_MEDIA_PER_REPORT = 3;

        vm.getPictureFromGallery = getPictureFromGallery;

        var invalidIds = [],
            intent = Storage.get("intent") || {};

        activate();

        /**
         * @name getPictureFromGallery
         * @desc Retourne l'URI d'une image selectionnée par l'utilisateur
         */
        function getPictureFromGallery() {
            navigator.camera.getPicture(
                function(imageURI) {
                    vm.report.ged.push({ content: imageURI });
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                },
                angular.noop,
                {
                    quality: 50,
                    destinationType: navigator.camera.DestinationType.FILE_URL,
                    sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
                    correctOrientation: true
                }
            );
        }

        /**
         * @name getZoneIntersect
         * @param {String} geom
         * @desc Retourne la zone spécifique correspondant au wkt passé en paramètre ou false
         */
        function getZoneIntersect(geom) {
            var wktReader = new jsts.io.WKTReader();
            var position = wktReader.read(geom);
            for (var zone in Site.current.zones_specifiques) {
                // Pour chaque zones spécifiques existantes
                var zone_spe = wktReader.read(Site.current.zones_specifiques[zone].geom);
                // On teste l'intersection avec la position du CF
                if (zone_spe.intersects(position)) {
                    // On a trouvé une intersection
                    return parseInt(zone);
                }
            }
            return false;
        }

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            $rootScope.currentPage = "Saisie de compte-rendu";

            if (!checkInputParameters($routeParams)) {
                return;
            }

            if (!isNaN(+$routeParams.assets)) {
                $routeParams.assets = [+$routeParams.assets];
            }

            vm.report = new Report($routeParams.assets, $routeParams.activity, $routeParams.report_mission);

            Asset.findAssetsByGuids(vm.report.assets, function(assets) {
                invalidIds = angular.copy(vm.report.assets);

                for (var i = 0; i < assets.length; i++) {
                    if (assets[i].id) {
                        vm.assets.push(assets[i]);
                        invalidIds.splice(invalidIds.indexOf(assets[i].id), 1);
                    }
                }

                if (invalidIds.length > 0) {
                    alertify.log(
                        i18n.get(
                            invalidIds.length > 1 ? "_REPORT_ASSET_NOT_FOUND_P" : "_REPORT_ASSET_NOT_FOUND_S",
                            invalidIds.join(", ")
                        )
                    );
                    return;
                }

                var myPosition = null;
                // Si un asset est fournis, on construit le WKT string de sa géométrie
                if (vm.assets.length > 0) {
                    var asset_geom = vm.assets[0].geometry;
                    myPosition = asset_geom.type + "(";

                    var coord_asset = "";
                    if (asset_geom.type.toUpperCase() === "POINT") {
                        coord_asset += vm.assets[0].geometry.coordinates.join(" ");
                    } else if (asset_geom.type.toUpperCase() === "LINESTRING") {
                        coord_asset = vm.assets[0].geometry.coordinates
                            .map(function(geom) {
                                return geom.join(" ");
                            })
                            .join(",");
                    }
                    myPosition += coord_asset + ")";
                }

                // Si des coordonnées long/lat sont fournis, il s'agit d'un CR pointé
                if (vm.report.latlng) {
                    var position_geom = vm.report.latlng.split(",");
                    myPosition = "POINT(" + position_geom[1] + " " + position_geom[0] + ")";
                }

                // On récupere l'ID de la zone administrable si elle existe
                vm.report.zone_specifique = getZoneIntersect(myPosition);

                // On construit les règles de masquage lié aux zones spécifique
                vm.report.masked_fields = {};
                if (vm.report.zone_specifique && vm.report.zone_specifique in Site.current.zones_specifiques_fields) {
                    // On teste la presence de la zone specifique dans le filtrage des champs
                    vm.report.masked_fields = Site.current.zones_specifiques_fields[vm.report.zone_specifique];
                }

                // On parcourt les champs présent dans les tabs d'activité pour les filtrer
                for (var tab = 0; tab < vm.report.activity.tabs.length; tab++) {
                    var cr_fields = {};
                    for (var f in vm.report.activity.tabs[tab].fields) {
                        var cr_field = vm.report.activity.tabs[tab].fields[f];
                        if (checkFieldZoneSpecifique(cr_field)) {
                            cr_fields[f] = vm.report.activity.tabs[tab].fields[f];
                        }
                    }
                    vm.report.activity.tabs[tab].fields = cr_fields;
                }

                // On applique les valeurs par défaut sur chaque tab
                for (var i = 0; i < vm.report.activity.tabs.length; i++) {
                    applyDefaultValues(vm.report.activity.tabs[i].fields);
                }

                // On parcourt une nouvelle fois les tabs pour appliquer les conséquences entres champs
                for (var cons_tab = 0; cons_tab < vm.report.activity.tabs.length; cons_tab++) {
                    for (var f in vm.report.activity.tabs[cons_tab].fields) {
                        var cons_field = vm.report.activity.tabs[cons_tab].fields[f];
                        applyConsequences(cons_field.id);
                    }
                }

                setTimeout(function() {
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                }, 1000);
            });
        }

        /**
         * @name checkFieldZoneSpecifique
         * @param {Object} field
         * @vm
         * @desc Permet de savoir si un champs doit être filtré en fonction des zones spécifiques
         */
        function checkFieldZoneSpecifique(field) {
            var result =
                // Dans le cas du ref national avec un champs national
                (!vm.report.zone_specifique && !field.zone_specifique) ||
                (vm.report.zone_specifique &&
                    (field.zone_specifique == vm.report.zone_specifique ||
                        (!field.zone_specifique &&
                            !(field.id in vm.report.masked_fields && !vm.report.masked_fields[field.id].visible)))); // Dans le cas d'une zone specifique //avec un champs de la même zone specifique ou du ref national et qui ne soit pas masqué
            return result;
        }

        /**
         * @name applyConsequences
         * @param {Number} srcId
         * @vm
         * @desc Applique les conséquences entre champs
         */
        function applyConsequences(srcId) {
            var field = vm.report.activity._fields[srcId],
                targetField,
                i,
                lim,
                act,
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

                cond = vm.report.fields[srcId] === act.condition;
                switch (act.type) {
                    case "show":
                        targetField.visible = cond;
                        // Si targetField est une case à cocher, elle a peut-être
                        // aussi des conséquences. Si une case à cocher devient invisible,
                        // il faut qu'on la décoche et qu'on applique ses conséquences.
                        if (!!!cond && targetField.type === "O") {
                            vm.report.fields[act.target] = "N";
                            vm.applyConsequences(act.target);
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
            alertify.confirm(i18n.get("_CANCEL_REPORT_CREATION", Site.current.label), function(yes) {
                if (yes) {
                    $location.path("map/" + Site.current.id);
                    Intents.end();
                    $scope.$apply();
                }
            });
        }

        /**
         * @name sendReport
         * @vm
         * @desc Envoie le compte rendu
         */
        function sendReport() {
            vm.sendingReport = true;
            var preparedReport = prepareReport(vm.report);
            var reportSize = JSON.stringify(preparedReport).length;
            // Si la taille du JSON est trop importante, on prévient l'utilisateur pour qu'il
            // réduise les pièces jointes ou la résolution des photos
            if ((4 * reportSize) / 3 > Right.get("_MAX_SIZE_POST_REQ")) {
                //TODO : Faire mieux que simplement supprimer les images
                // On vide toutes les images sélectionnées
                vm.report.ged = Array();
                // On affiche le message d'erreur
                vm.report.imgError = true;
                vm.sendingReport = false;
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            } else {
                // Le rapport est prêt a être envoyé
                Synchronizator.addNew(preparedReport);
                endOfReport();
            }
        }

        /**
         * @name prepareReport
         * @desc Prepare le compte rendu avant de l'envoyer
         * @param {Report} reportin Le compte rendu a préparer
         * @returns {Object}
         */
        function prepareReport(reportin) {
            var report = angular.copy(reportin),
                i;
            for (i in report.fields) {
                if (report.fields[i] instanceof Date && report.activity._fields[i].type === "T") {
                    report.fields[i] =
                        Utils.pad(report.fields[i].getHours()) + ":" + Utils.pad(report.fields[i].getMinutes());
                }
                if (report.fields[i] instanceof Date && report.activity._fields[i].type === "D") {
                    report.fields[i] =
                        report.fields[i].getFullYear() +
                        "-" +
                        Utils.pad(report.fields[i].getMonth() + 1) +
                        "-" +
                        Utils.pad(report.fields[i].getDate());
                }
                if (
                    report.fields[i] &&
                    typeof report.fields[i] === "object" &&
                    report.fields[i].id &&
                    report.fields[i].text
                ) {
                    report.fields[i] = report.fields[i].id;
                }
            }
            for (i = 0; i < report.ged.length; i++) {
                report.ged[i] = { content: Utils.getBase64Image(report.ged[i].content) };
            }
            for (i in report.overrides) {
                if (report.overrides[i]) {
                    report.fields[i] = report.overrides[i];
                }
            }
            report.activity = report.activity.id;
            report.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

            // On vérifie l présence du parametre assets
            if (report.assets && report.assets.constructor === Array) {
                // On supprime les valeurs erronées
                report.assets = report.assets.filter(function(n) {
                    return !(n == undefined || n == "undefined" || n == "");
                });
            }

            //On vérifie que l'ID mission soit valable
            if (report.mission && isNaN(report.mission)) {
                // Dans le cas contraire on le vide
                report.mission = null;
            }

            // Nous n'avons plus besoin de cette clef
            delete report.masked_fields;

            return report;
        }

        /**
         * @name getValueFromAssets
         * @param {String} pkey
         * @param {String} okey
         * @desc Retourne la valeur d'un attribut d'un objet
         */
        function getValueFromAssets(pkey, okey) {
            var rv = {},
                val,
                list = Site.getList(pkey, okey);
            for (var i = 0, lim = vm.assets.length; i < lim; i++) {
                var a = vm.assets[i].attributes;
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
        function applyDefaultValues(_fields) {
            var fields = vm.report.fields,
                def,
                field;

            //for (var i = 0; i < _fields.length; i++) {
            for (var f in _fields) {
                field = vm.report.activity._fields[_fields[f].id];
                def = field["default"];

                // Par priorité sur les valeurs par défaut, on applique les valeurs
                // fixées dans le scope par les intents.
                if (intent["report_fields[" + field.label + "]"]) {
                    def = intent["report_fields[" + field.label + "]"];
                }
                if (intent["report_fields[$" + field.id + "]"]) {
                    def = intent["report_fields[$" + field.id + "]"];
                }

                if (!def) {
                    continue;
                } else if ("string" === typeof def) {
                    //valeur par défaut de type constante
                    if (field.type === "D") {
                        if (def === "#TODAY#") {
                            var d = new Date();
                            def = d;
                        } else {
                            try {
                                def = new Date(def);
                            } catch (error) {
                                def = new Date();
                            }
                        }

                        var month = String(d.getMonth() + 1);
                        var day = String(d.getDate());
                        var year = String(d.getFullYear());
                        if (month.length < 2) month = "0" + month;
                        if (day.length < 2) day = "0" + day;
                        var formated_def = [day, month, year].join("/");

                        fields[field.id] = def;
                        vm.report.roFields[field.id] = formated_def;
                    } else if (field.type === "T") {
                        if (def === "#NOW#") {
                            var d = new Date();
                            d.setSeconds(0);
                            d.setMilliseconds(0);
                            def = d;
                        } else {
                            try {
                                d = def.split(":");
                                var hours = d[0];
                                var minutes = d[1];
                                def = new Date(1970, 0, 1, hours, minutes, 0);
                            } catch (error) {
                                var d = new Date();
                                d.setSeconds(0);
                                d.setMilliseconds(0);
                                def = d;
                            }
                        }
                        var hour = String(d.getHours());
                        var minute = String(d.getMinutes());
                        if (hour.length < 2) hour = "0" + hour;
                        if (minute.length < 2) minute = "0" + minute;
                        var formated_def = [hour, minute, "00"].join(":");

                        fields[field.id] = def;
                        vm.report.roFields[field.id] = formated_def;
                    } else if (field.type === "N") {
                        def = +def;
                        fields[field.id] = def;
                        vm.report.roFields[field.id] = def;
                    } else {
                        fields[field.id] = def;
                        vm.report.roFields[field.id] = def;
                    }
                } else {
                    var defasset = getValueFromAssets(def.pkey, vm.report.activity.okeys[0]);

                    if (!angular.equals({}, defasset)) {
                        var output = formatFieldEntry(defasset);
                        if (field.type === "N") {
                            output = +output;
                        }
                        vm.report.roFields[field.id] = output;
                        vm.report.overrides[field.id] = output;
                        fields[field.id] = output.length != 0 ? output : defasset;
                    }
                }
            }
        }

        /**
         * @name formatFieldEntry
         * @param {String|Array} val
         * @desc Formatte le champs
         */
        function formatFieldEntry(val) {
            if ("string" === typeof val) {
                return val;
            }
            var str = [];
            for (var a in val) {
                if (val[a]) {
                    str.push(val[a]);
                }
            }
            return str.join(", ");
        }

        /**
         * @name endOfReport
         * @desc Procédure de fin de compte rendu
         */
        function endOfReport() {
            if (intent != null && $rootScope.fromIntent === true) {
                Storage.remove("intent");
                $rootScope.fromIntent = false;
                buildReport(function(report) {
                    if (intent.report_url_redirect) {
                        intent.report_url_redirect += intent.report_url_redirect.indexOf("?") === -1 ? "?" : "&";
                        intent.report_url_redirect += "__PATRIID=" + report.__PATRIID;
                        intent.report_url_redirect += "&__LATLNG=" + report.__LATLNG;
                        intent.report_url_redirect =
                            injectCallbackValues(intent.report_url_redirect) || intent.report_url_redirect;
                        window.plugins.launchmyapp.startActivity(
                            { action: "android.intent.action.VIEW", url: intent.report_url_redirect },
                            angular.noop,
                            angular.noop
                        );
                    } else {
                        window.plugins.launchmyapp.finishActivity(report, angular.noop, angular.noop);
                    }
                });
            }
            $location.path("map/" + Site.current.id);
        }

        /**
         * @name injectCallbackValues
         * @param {String} url
         * @desc Injecte les valeurs de retour pour les intents
         */
        function injectCallbackValues(url) {
            var injectedValues;
            if (url.indexOf("[LABEL_INDEXED_FIELDS]") !== -1) {
                injectedValues = "";
                for (var field in vm.report.fields) {
                    if (vm.report.fields.hasOwnProperty(field)) {
                        var val = vm.report.fields[field];
                        // /!\ UGLY ALERT WORKS WITH ONLY ONE ASSETS
                        if (typeof val === "object") {
                            for (var j in val) {
                                val = val[j];
                                break;
                            }
                        }
                        injectedValues += "fields[" + vm.report.activity._fields[field].label + "]=" + val + "&";
                    }
                }
                injectedValues = injectedValues.slice(0, injectedValues.length - 1);
                url = url.replace("[LABEL_INDEXED_FIELDS]", injectedValues);
            } else if (url.indexOf("[KEY_INDEXED_FIELDS]") !== -1) {
                injectedValues = "";
                for (var field_ in vm.report.fields) {
                    if (vm.report.fields.hasOwnProperty(field_)) {
                        injectedValues += "fields[" + field_ + "]=" + vm.report.fields[field_] + "&";
                    }
                }
                injectedValues = injectedValues.slice(0, injectedValues.length - 1);
                url = url.replace("[KEY_INDEXED_FIELDS]", injectedValues);
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
                alertify.alert("Aucun site selectionné.");
                return false;
            } else if (!routeParams.activity) {
                alertify.alert("Aucune activité selectionnée.");
                return false;
            } else if (!routeParams.assets) {
                alertify.alert("Aucun patrimoine selectionné.");
                return false;
            }
            return true;
        }

        /**
         * @name buildReport
         * @desc Construit le report pour le retour JSON (intents)
         */
        function buildReport(callback) {
            var report = {};
            var i, center;

            for (i in vm.report.fields) {
                // TODO : Pourquoi le champ est-il en undefined ?
                if (vm.report.activity._fields[i] && "label" in vm.report.activity._fields[i]) {
                    report[vm.report.activity._fields[i].label] =
                        typeof vm.report.fields[i] == "object" &&
                        vm.report.fields[i].toString().match(/object/) != null &&
                        jQuery.isEmptyObject(vm.report.fields[i])
                            ? undefined
                            : vm.report.fields[i];
                }
            }
            // On injecte les métadonnées
            if (vm.assets.length > 0) {
                report.__LATLNG = [];
                report.__PATRIID = [];
                for (i in vm.assets) {
                    center = vm.assets[i].getCenter();
                    report.__LATLNG.push(center[0] + "," + center[1]);
                    report.__PATRIID.push(vm.assets[i].id);
                }
                report.__LATLNG = report.__LATLNG.join(";");
                report.__PATRIID = report.__PATRIID.join(";");
                callback(report);
            } else if (vm.report.latlng) {
                report.__PATRIID = null;
                report.__LATLNG = vm.report.latlng;
                callback(report);
            } else {
                // On est jamais sensé passé par là mais c'est dans la spec...
                GPS.getCurrentLocation(function(lng, lat) {
                    report.__PATRIID = null;
                    report.__LATLNG = lat + "," + lng;
                    callback(report);
                });
            }
        }
    }
})();
