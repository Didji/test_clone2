/**
 *
 *  A refactoriser avec le controller.report
 *
 */
(function() {
    "use strict";

    angular.module("smartgeomobile").directive("multiReport", multiReportDirective);

    multiReportDirective.$inject = [
        "G3ME",
        "Asset",
        "Report",
        "Synchronizator",
        "Activity",
        "Site",
        "Storage",
        "i18n",
        "Utils",
        "Smartgeo",
        "Intents",
        "$rootScope",
        "Right"
    ];

    function multiReportDirective(
        G3ME,
        Asset,
        Report,
        Synchronizator,
        Activity,
        Site,
        Storage,
        i18n,
        Utils,
        Smartgeo,
        Intents,
        $rootScope,
        Right
    ) {
        var reports,
            unwatch_report_ged = null,
            initialTargets = [];

        return {
            restrict: "E",
            scope: { intent: "=" },
            templateUrl: "javascripts/directives/template/multi.report.html",
            link: link
        };

        function link(scope, element, attrs, controller) {
            Smartgeo._addEventListener("backbutton", Intents.end);

            if (!scope.intent) {
                return false;
            }

            reports = {};

            scope.intent.assets_by_id = {};
            scope.intent.positions = {};

            scope.cancel = cancel;
            scope.save = save;
            scope.applyConsequences = applyConsequences;
            scope.getPictureFromGallery = getPictureFromGallery;

            scope.report = null;
            scope.assets = [];
            scope.isAndroid = navigator.userAgent.match(/Android/i);
            scope.isIOS = navigator.userAgent.match(/iP(od|hone|ad)/i);
            scope.numberPattern = /^(\d+([.]\d*)?|[.]\d+)$/;

            var activity_id = parseInt(scope.intent.multi_report_activity);
            scope.intent.multi_report_activity = Activity.findOne(+scope.intent.multi_report_activity);
            if (!scope.intent.multi_report_activity) {
                return alertify.alert(i18n.get("_INTENT_ACTIVITY_NOT_FOUND_"));
            } else if (
                scope.intent.multi_report_activity.type !== "multi_assets_tour" ||
                !scope.intent.multi_report_activity.multi_assets_tour
            ) {
                return alertify.alert(i18n.get("_INTENT_ACTIVITY_NOT_COMPATIBLE_"));
            } else if (
                scope.intent.multi_report_activity.multi_assets_tour.switch_field === null ||
                scope.intent.multi_report_activity.multi_assets_tour.switch_field === undefined
            ) {
                return alertify.alert(i18n.get("_INTENT_NOT_VALID_"));
            }

            //scope.intent.multi_report_field = scope.intent.multi_report_activity._fields[+scope.intent.multi_report_activity.multi_assets_tour.switch_field];
            var witch_field = scope.intent.multi_report_activity.multi_assets_tour.switch_field;
            var abort = false;
            for (var i = 0; i < Site.current.activities._byId[activity_id].tabs.length && !abort; i++) {
                for (var field_idx in Site.current.activities._byId[+activity_id].tabs[i].fields) {
                    if (
                        parseInt(Site.current.activities._byId[activity_id].tabs[i].fields[field_idx].id) == witch_field
                    ) {
                        scope.intent.multi_report_field =
                            Site.current.activities._byId[activity_id].tabs[i].fields[field_idx];
                        abort = true;
                    }
                }
            }

            if (!scope.intent.multi_report_field) {
                // Il y a un probleme de configuration avec le switch-field des CR
                // Certainement un probleme de configuration Smartgeo
                // On alerte l'utilisateur
                alertify.alert(i18n.get("_REPORT_MULTI_SWITCH_FIELD_NOT_FOUND_"));
            } else {
                scope.intent.multi_report_target = scope.intent.multi_report_target.split(",");
                initialTargets = angular.copy(scope.intent.multi_report_target);
                Asset.findAssetsByGuids(scope.intent.multi_report_target, createMarkers);
                createExitControl();
            }

            $rootScope.addAssetToTour = function addAssetToTour(asset) {
                scope.intent.multi_report_target.push(asset);
                createMarker(asset);
            };

            $rootScope.addLocationToTour = function addLocationToTour(lat, lng) {
                G3ME.map.closePopup();
                createMarkerForPosition(lat, lng);
            };

            /**
             * @name getPictureFromGallery
             * @desc Retourne l'URI d'une image selectionnée par l'utilisateur
             */
            function getPictureFromGallery() {
                navigator.camera.getPicture(
                    function(imageURI) {
                        scope.report.ged.push({ content: imageURI });
                        if (!scope.$$phase) {
                            scope.$digest();
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
             * @name createExitControl
             * @desc Crée le control de sortie de multi report
             */
            function createExitControl() {
                var control = L.Control.extend({
                    onAdd: function() {
                        var container = L.DomUtil.create("div", "bottom-bar");
                        $(container)
                            .html('<a href="#">' + (scope.intent.multi_report_outmsg || "Quitter") + "</a>")
                            .on("click", exitClickHandler);
                        return container;
                    }
                });
                G3ME.map.addControl(new control());
            }

            /**
             * @name applyConsequences
             * @param {Number} srcId
             * @scope
             * @desc Applique les conséquences entre champs
             */
            function applyConsequences(srcId) {
                var field = scope.report.activity._fields[srcId],
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
                    targetField = scope.report.activity._fields[act.target];
                    if (!targetField) {
                        continue;
                    }

                    cond = scope.report.fields[srcId] == act.condition;
                    var cons = testConsequences(act.target);
                    switch (act.type) {
                        case "show":
                            targetField.visible = cond;
                            // Si targetField est une case à cocher, elle a peut-être
                            // aussi des conséquences. Si une case à cocher devient invisible,
                            // il faut qu'on la décoche et qu'on applique ses conséquences.
                            if (!!!cond && targetField.type === "O") {
                                scope.report.fields[act.target] = "N";
                                scope.applyConsequences(act.target);
                            }
                            break;
                        case "require":
                            targetField.required = cond || cons.require;
                            break;
                        default:
                            targetField.required = !!targetField.required;
                    }
                }
            }

            /**
             * @name testConsequences
             * @param {Number} targetId
             * @vm
             * @desc On test
             */
            function testConsequences(targetId) {
                var visible = undefined;
                var require = undefined;
                // On Parcours les champs
                for (var cons_tab = 0; cons_tab < scope.report.activity.tabs.length; cons_tab++) {
                    for (var f in scope.report.activity.tabs[cons_tab].fields) {
                        var cons_field = scope.report.activity.tabs[cons_tab].fields[f];
                        if ("actions" in cons_field) {
                            for (var i = 0; i < cons_field.actions.length; i++) {
                                // Le champs doit être visible pour que l'on en tienne compte
                                if (cons_field.actions[i].target == targetId && cons_field.visible != false) {
                                    var act = cons_field.actions[i];
                                    var cond = scope.report.fields[cons_field.id] == act.condition;
                                    switch (act.type) {
                                        case "show":
                                            // Théoriquement on ne peut pas arriver ici car Smartgeo empeche
                                            // via l'UI de saisir plusieur conséquence de visible sur un même champs
                                            // Note : Certains client passent par des insert direct en base (Véolia)
                                            // Il faut donc gérer ce cas de figure
                                            visible = visible || cond;
                                            break;
                                        case "require":
                                            require = require || cond;
                                            break;
                                    }
                                }
                            }
                        }
                    }
                }
                return { visible: visible, require: require };
            }

            /**
             * @name applyDefaultValues
             * @desc Applique les valeurs par defaut
             */
            function applyDefaultValues(_fields) {
                var def, field;
                for (var i = 0; i < _fields.length; i++) {
                    field = scope.report.activity._fields[_fields[i].id];

                    if (scope.report.fields[field.id]) {
                        //champ déjà enregistré, on applique pas les valeurs par défaut
                        continue;
                    }

                    def = field["default"];

                    // Par priorité sur les valeurs par défaut, on applique les valeurs
                    // fixées dans le scope par les intents.
                    if (scope.intent["report_fields[" + field.label + "]"]) {
                        def = scope.intent["report_fields[" + field.label + "]"];
                    }
                    if (scope.intent["report_fields[$" + field.id + "]"]) {
                        def = scope.intent["report_fields[$" + field.id + "]"];
                    }

                    if (!def) {
                        continue;
                    } else if ("string" === typeof def) {
                        var formated_def, d;
                        //valeur par défaut de type constante
                        if (field.type === "D") {
                            if (def === "#TODAY#") {
                                d = new Date();
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
                            formated_def = [day, month, year].join("/");

                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = formated_def;
                        } else if (field.type === "T") {
                            if (def === "#NOW#") {
                                d = new Date();
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
                            formated_def = [hour, minute, "00"].join(":");

                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = formated_def;
                        } else if (field.type === "N") {
                            def = +def;
                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = def;
                        } else {
                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = def;
                        }
                    } else {
                        /*
                        Dans le cas d'un champs associé à un valeur patrimoine
                        */
                        var defasset = getValueFromAssets(def.pkey, scope.report.activity.okeys[0]);
                        if (!angular.equals({}, defasset)) {
                            var output = formatFieldEntry(defasset);
                            if (field.type === "N") {
                                output = +output;
                            }
                            scope.report.roFields[field.id] = output;
                            scope.report.overrides[field.id] = output;
                            scope.report.fields[field.id] = output.length != 0 ? output : defasset;
                        }
                    }
                }
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
                for (var i = 0, lim = scope.assets.length; i < lim; i++) {
                    var a = scope.assets[i].attributes;
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
             * @name exitClickHandler
             * @desc Handler de fin du mode
             * @param {Event} e
             */
            function exitClickHandler(e) {
                e.preventDefault();

                scope.intent.multi_report_assets_id = [];

                var asset, latlng, redirect;
                for (var i = 0; i < scope.intent.multi_report_target.length; i++) {
                    asset = scope.intent.multi_report_target[i];

                    // On passe automatiquement l'etat d'un equipement à "fait"
                    // si un l'agent a saisis un rapport dessus
                    if (asset.currentState === 0) {
                        if (!reports[+asset.id]) {
                            continue;
                        } else {
                            asset.currentState++;
                        }
                    }

                    // Si aucun rapport n'a été saisi
                    if (!reports[+asset.id]) {
                        // On en créé un vierge sans valeur de champs
                        reports[+asset.id] = new Report(
                            asset.id,
                            scope.intent.multi_report_activity.id,
                            scope.intent.multi_report_mission
                        );
                    }

                    reports[+asset.id].fields[scope.intent.multi_report_field.id] =
                        scope.intent.multi_report_field.options[asset.currentState].value;

                    if (initialTargets.indexOf("" + asset.id) > -1) {
                        scope.intent.multi_report_assets_id.push(asset.id);
                    }

                    var preparedReport = prepareReport(reports[+asset.id]);

                    Synchronizator.addNew(preparedReport);
                }

                for (latlng in scope.intent.positions) {
                    asset = scope.intent.positions[latlng];

                    if (asset.currentState === 0) {
                        if (!reports[latlng]) {
                            continue;
                        } else {
                            asset.currentState++;
                        }
                    }

                    if (!reports[latlng]) {
                        reports[latlng] = new Report(
                            latlng,
                            scope.intent.multi_report_activity.id,
                            scope.intent.multi_report_mission
                        );
                    }

                    reports[latlng].fields[scope.intent.multi_report_field.id] =
                        scope.intent.multi_report_field.options[asset.currentState].value;
                    Synchronizator.addNew(prepareReport(reports[latlng]));
                }

                // Si une URL de redirection a été spécifié à la lecture de l'intent
                if ($rootScope.multi_report_redirect) {
                    redirect = $rootScope.multi_report_redirect;
                    // Si la balise DONE_ASSETS est presente, on la remplace par les id des assets traités
                    redirect = redirect.replace("[DONE_ASSETS]", scope.intent.multi_report_assets_id.join(","));
                    // On vide l'URL de redirection
                    $rootScope.multi_report_redirect = null;
                    window.plugins.launchmyapp.startActivity(
                        { action: "android.intent.action.VIEW", url: redirect },
                        angular.noop,
                        angular.noop
                    );
                } else {
                    window.plugins.launchmyapp.finishActivity(
                        { done: scope.intent.multi_report_assets_id },
                        angular.noop,
                        angular.noop
                    );
                }
                return false;
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
                report.activity = report.activity.id;
                report.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

                // On vérifie la présence du parametre assets
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
             * @name createMarkers
             * @desc Crée les marqueurs qui changent d'état
             */
            function createMarkers(assets) {
                scope.intent.multi_report_target = assets;
                scope.intent.multi_report_icons = {};
                scope.intent.multi_report_markers = {};
                for (var state in scope.intent.multi_report_field.options) {
                    var icon = scope.intent.multi_report_field.options[state].icon;
                    scope.intent.multi_report_icons[state] = L.icon({
                        iconUrl: icon.content,
                        iconSize: [icon.width, icon.height],
                        iconAnchor: [icon.width / 2, icon.height / 2]
                    });
                }

                angular.forEach(scope.intent.multi_report_target, function(asset, idx) {
                    // Pour chaque asset on lui associe un Marker
                    var marker = createMarker(asset);
                    G3ME.map.addLayer(marker);
                });
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
                        // On a trouver une intersection
                        return parseInt(zone);
                    }
                }
                return false;
            }

            function createMarkerForPosition(lat, lng) {
                var asset = {};
                var latlng = lat + "," + lng;
                scope.intent.positions[latlng] = asset;
                asset.currentState = 0;
                return L.marker([lat, lng], {
                    icon: scope.intent.multi_report_icons[asset.currentState]
                })
                    .on("click", function() {
                        asset.currentState = ++asset.currentState % scope.intent.multi_report_field.options.length;
                        this.setIcon(scope.intent.multi_report_icons[asset.currentState]);
                    })
                    .on("contextmenu", function() {
                        Smartgeo._removeEventListener("backbutton", Intents.end);
                        Smartgeo._addEventListener("backbutton", cancel);
                        var field;
                        scope.report =
                            reports[latlng] ||
                            new Report(
                                latlng,
                                scope.intent.multi_report_activity.id,
                                scope.intent.multi_report_mission
                            );
                        for (var i in scope.report.activity._fields) {
                            field = scope.report.activity._fields[i];
                            scope.report.fields[field.id] = scope.report.fields[field.id] || "";
                        }

                        var myPosition = "POINT(" + lng + " " + lat + ")";

                        // On récupere l'ID de la zone administrable si elle existe
                        scope.report.zone_specifique = getZoneIntersect(myPosition);

                        // On construit les règles de masquage lié aux zones spécifique
                        scope.report.masked_fields = {};
                        if (
                            scope.report.zone_specifique &&
                            scope.report.zone_specifique in Site.current.zones_specifiques_fields
                        ) {
                            // On teste la presence de la zone specifique dans le filtrage des champs
                            scope.report.masked_fields =
                                Site.current.zones_specifiques_fields[scope.report.zone_specifique];
                        }

                        // On parcourt les champs présent dans les tabs d'activité pour les filtrer
                        for (var cr_tab = 0; cr_tab < scope.report.activity.tabs.length; cr_tab++) {
                            var cr_fields = {};
                            for (var f in scope.report.activity.tabs[cr_tab].fields) {
                                var cr_field = scope.report.activity.tabs[cr_tab].fields[f];
                                if (checkFieldZoneSpecifique(cr_field)) {
                                    cr_fields[f] = scope.report.activity.tabs[cr_tab].fields[f];
                                }
                            }
                            scope.report.activity.tabs[tab].fields = cr_fields;
                        }

                        // On applique les valeurs par défaut sur chaque tab
                        for (var i = 0; i < scope.report.activity.tabs.length; i++) {
                            applyDefaultValues(scope.report.activity.tabs[i].fields);
                        }

                        // On parcourt une nouvelle fois les tabs pour appliquer les conséquences entres champs
                        for (var cons_tab = 0; cons_tab < scope.report.activity.tabs.length; cons_tab++) {
                            for (var f in scope.report.activity.tabs[cons_tab].fields) {
                                var cons_field = scope.report.activity.tabs[cons_tab].fields[f];
                                applyConsequences(cons_field.id);
                            }
                        }

                        setTimeout(function() {
                            if (!scope.$$phase) {
                                scope.$digest();
                            }
                        }, 100);

                        $("#multireport").modal("toggle");
                        $("#multireport input, #multireport select")
                            .first()
                            .focus();
                    })
                    .addTo(G3ME.map);
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
                    (!scope.report.zone_specifique && !field.zone_specifique) ||
                    (scope.report.zone_specifique &&
                        (field.zone_specifique == scope.report.zone_specifique ||
                            (!field.zone_specifique &&
                                !(
                                    field.id in scope.report.masked_fields &&
                                    !scope.report.masked_fields[field.id].visible
                                )))); // Dans le cas d'une zone specifique //avec un champs de la même zone specifique ou du ref national et qui ne soit pas masqué
                return result;
            }

            function createMarker(asset, status) {
                scope.intent.assets_by_id[asset.id] = asset;
                asset.currentState = status || 0;
                var marker = L.marker(Asset.getCenter(asset), {
                    icon: scope.intent.multi_report_icons[asset.currentState]
                })
                    .on("click", function() {
                        asset.currentState = ++asset.currentState % scope.intent.multi_report_field.options.length;
                        this.setIcon(scope.intent.multi_report_icons[asset.currentState]);
                    })
                    .on("contextmenu", function() {
                        Smartgeo._removeEventListener("backbutton", Intents.end);
                        Smartgeo._addEventListener("backbutton", cancel);
                        var field, i, f;

                        if (reports[asset.id]) {
                            // Si un rapport a déjà été saisi, on le récupere
                            scope.report = reports[asset.id];
                        } else {
                            // Sinon on initialise un nouveau rapport
                            scope.report = new Report(
                                asset.id,
                                scope.intent.multi_report_activity.id,
                                scope.intent.multi_report_mission
                            );
                            for (i in scope.report.activity._fields) {
                                field = scope.report.activity._fields[i];
                                // On initialise les champs du modele
                                scope.report.fields[field.id] = "";
                            }

                            var asset_geom = asset.geometry;
                            var myPosition = asset_geom.type + "(";

                            var coord_asset = "";
                            if (asset_geom.type.toUpperCase() === "POINT") {
                                coord_asset += asset.geometry.coordinates.join(" ");
                            } else if (asset_geom.type.toUpperCase() === "LINESTRING") {
                                coord_asset = asset.geometry.coordinates
                                    .map(function(geom) {
                                        return geom.join(" ");
                                    })
                                    .join(",");
                            }
                            myPosition += coord_asset + ")";

                            // On récupere l'ID de la zone administrable si elle existe
                            scope.report.zone_specifique = getZoneIntersect(myPosition);

                            // On construit les règles de masquage lié aux zones spécifique
                            scope.report.masked_fields = {};
                            if (
                                scope.report.zone_specifique &&
                                scope.report.zone_specifique in Site.current.zones_specifiques_fields
                            ) {
                                // On teste la presence de la zone specifique dans le filtrage des champs
                                scope.report.masked_fields =
                                    Site.current.zones_specifiques_fields[scope.report.zone_specifique];
                            }

                            // On parcourt les champs présent dans les tabs d'activité pour les filtrer
                            for (var cr_tab = 0; cr_tab < scope.report.activity.tabs.length; cr_tab++) {
                                var fields = [];
                                for (f in scope.report.activity.tabs[cr_tab].fields) {
                                    var cr_field = scope.report.activity.tabs[cr_tab].fields[f];
                                    if (checkFieldZoneSpecifique(cr_field)) {
                                        fields.push(scope.report.activity.tabs[cr_tab].fields[f]);
                                    }
                                }
                                scope.report.activity.tabs[cr_tab].fields = fields;
                            }

                            for (i = 0; i < scope.report.assets.length; i++) {
                                scope.assets.push(new Asset(scope.report.assets[i]));
                            }

                            // On applique les valeurs par défaut sur chaque tab
                            for (i = 0; i < scope.report.activity.tabs.length; i++) {
                                applyDefaultValues(scope.report.activity.tabs[i].fields);
                            }

                            // On applique la valeur par défaut sur le switch field
                            scope.report.fields[scope.intent.multi_report_activity.multi_assets_tour.switch_field] =
                                scope.intent.multi_report_field.options[asset.currentState].value;

                            // On parcourt une nouvelle fois les tabs pour appliquer les conséquences entres champs
                            for (var cons_tab = 0; cons_tab < scope.report.activity.tabs.length; cons_tab++) {
                                for (f in scope.report.activity.tabs[cons_tab].fields) {
                                    var cons_field = scope.report.activity.tabs[cons_tab].fields[f];
                                    applyConsequences(cons_field.id);
                                }
                            }
                        }

                        unwatch_report_ged = scope.$watch("report.ged", function(n, o) {
                            scope.reportForm.$setDirty();
                        });

                        setTimeout(function() {
                            if (!scope.$$phase) {
                                scope.$digest();
                            }
                            $("#multireport").modal("toggle");
                            $("#multireport input, #multireport select")
                                .first()
                                .focus();
                        }, 100);
                    });

                // On stocke le marker dans un array pour faciliter les manipulations futures
                scope.intent.multi_report_markers[asset.id] = marker;
                return marker;
            }

            /**
             * @name save
             * @return Sauvegarde le rapport courant en attendant la synchro
             */
            function save(reportin) {
                var report = angular.copy(reportin);
                var preparedReport = prepareReport(report);
                var reportSize = JSON.stringify(preparedReport).length;
                if ((4 * reportSize) / 3 > Right.get("_MAX_SIZE_POST_REQ")) {
                    reportin.imgError = true;
                    reportin.ged = Array();
                } else {
                    reports[scope.report.assets[0] || scope.report.latlng] = scope.report;
                    // Fermeture avec demande de MAJ Marker
                    close(true, reportin);
                }
            }

            /**
             * @name cancel
             * @return Annule la saisie en cours
             */
            function cancel() {
                if (!scope.reportForm.$pristine) {
                    alertify.set({
                        labels: {
                            ok: "OK",
                            cancel: "Retour"
                        }
                    });

                    alertify.confirm(i18n.get("_CANCEL_REPORT_EDITION"), function(yes) {
                        if (yes) {
                            return close();
                        }
                    });
                } else {
                    return close();
                }
            }

            /**
             * @name close
             * @return Ferme la fenêtre
             */
            function close(refresh_marker, reportin) {
                if (refresh_marker && scope.assets.length) {
                    angular.forEach(scope.assets, function(asset, idx) {
                        G3ME.map.removeLayer(scope.intent.multi_report_markers[asset.id]);
                        var current_state = 0;
                        angular.forEach(scope.intent.multi_report_field.options, function(elem, idx) {
                            if (
                                elem.value ==
                                reportin.fields[scope.intent.multi_report_activity.multi_assets_tour.switch_field]
                            ) {
                                current_state = idx;
                            }
                        });

                        var marker = createMarker(asset, current_state);
                        G3ME.map.addLayer(marker);
                    });
                }

                if (unwatch_report_ged) {
                    unwatch_report_ged();
                }
                scope.report = null;
                scope.assets = [];
                scope.reportForm.$setPristine();
                $rootScope.multireport = null;
                $("#multireport").modal("toggle");
                Smartgeo._removeEventListener("backbutton", cancel);
                Smartgeo._addEventListener("backbutton", Intents.end);
            }
        }
    }
})();
