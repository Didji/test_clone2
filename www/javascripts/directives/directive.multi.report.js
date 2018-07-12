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
        "$rootScope"
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
        $rootScope
    ) {
        var reports,
            unwatch_report_ged = null,
            initialTargets = [];

        return {
            restrict: "E",
            scope: {
                intent: "="
            },
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

                    cond = scope.report.fields[srcId] === act.condition;
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
                    def,
                    i,
                    field,
                    date;
                for (i in scope.report.activity._fields) {
                    field = scope.report.activity._fields[i];

                    if (fields[field.id]) {
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
                        //valeur par défaut de type constante
                        if (field.type === "D" && def === "#TODAY#") {
                            date = new Date();
                            def =
                                date.getUTCFullYear() +
                                "-" +
                                Utils.pad(date.getUTCMonth() + 1) +
                                "-" +
                                Utils.pad(date.getUTCDate());
                            fields[field.id] = new Date(def);
                            scope.report.fields[field.id] = new Date(def);
                        } else if (field.type === "T" && def === "#NOW#") {
                            var d = new Date();
                            fields[field.id] = d;
                        } else if (field.type === "N") {
                            def = +def;
                            fields[field.id] = def;
                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = def;
                        } else {
                            fields[field.id] = def;
                            scope.report.fields[field.id] = def;
                            scope.report.roFields[field.id] = def;
                        }
                    } else {
                        def = getValueFromAssets(def.pkey, scope.report.activity.okeys[0]);
                        var output = formatFieldEntry(def);
                        if (field.type === "N") {
                            output = +output;
                        }
                        scope.report.roFields[field.id] = output;
                        scope.report.overrides[field.id] = output;
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
                angular
                    .element(document.getElementsByClassName("js-report-form")[0])
                    .on("click", "input:not(input[type=checkbox]), select, label, .chosen-container", function() {
                        var elt;
                        if (angular.element(this).prop("tagName") !== "label") {
                            elt = angular.element(this);
                        } else if (!angular.element(this).siblings("label").length) {
                            elt = angular.element(this);
                        } else {
                            elt = angular.element(this).siblings("label");
                        }
                        if (!elt.offset().top) {
                            return;
                        }
                        angular.element(".modal").animate(
                            {
                                scrollTop: elt.offset().top - 10
                            },
                            250
                        );
                        elt = null;
                    });
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

                var asset, assetid, latlng, redirect;

                for (assetid in scope.intent.multi_report_target) {
                    asset = scope.intent.multi_report_target[assetid];

                    if (asset.currentState === 0) {
                        if (!reports[+asset.id]) {
                            continue;
                        } else {
                            asset.currentState++;
                        }
                    }

                    if (!reports[+asset.id]) {
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

                    Synchronizator.addNew(prepareReport(reports[+asset.id]));
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

                if (scope.intent.multi_report_redirect) {
                    redirect = scope.intent.multi_report_redirect.replace(
                        "[DONE_ASSETS]",
                        scope.intent.multi_report_assets_id.join(",")
                    );
                    window.plugins.launchmyapp.startActivity(
                        {
                            action: "android.intent.action.VIEW",
                            url: redirect
                        },
                        angular.noop,
                        angular.noop
                    );
                } else {
                    window.plugins.launchmyapp.finishActivity(
                        {
                            done: scope.intent.multi_report_assets_id
                        },
                        angular.noop,
                        angular.noop
                    );
                }
                Storage.remove("intent");
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
                    report.ged[i] = {
                        content: Utils.getBase64Image(report.ged[i].content)
                    };
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
                    scope.intent.multi_report_icons[state] = L.icon({
                        iconUrl: icon.content,
                        iconSize: [icon.width, icon.height],
                        iconAnchor: [icon.width / 2, icon.height / 2]
                    });
                }
                scope.intent.multi_report_target.forEach(createMarker);
            }

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
                L.marker([lat, lng], {
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

                        /*************************************** */
                        var myPosition = "POINT(" + lng + " " + lat + ")";

                        // On récupere l'ID de la zone administrable si elle existe
                        scope.report.zone_specifique = getZoneIntersect(myPosition);

                        var masked_fields = {};
                        if (
                            scope.report.zone_specifique &&
                            scope.report.zone_specifique in Site.current.zones_specifiques_fields
                        ) {
                            // On teste la presence de la zone specifique dans le filtrage des champs
                            masked_fields = Site.current.zones_specifiques_fields[scope.report.zone_specifique];
                        }

                        for (var tab = 0; tab < scope.report.activity.tabs.length; tab++) {
                            var fields = {};
                            for (var f = scope.report.activity.tabs[tab].fields.length - 1; f >= 0; f--) {
                                var field = scope.report.activity.tabs[tab].fields[f];
                                if (
                                    // On ne se trouve pas dans une zone spécifique et il s'agit d'un champs spécifique
                                    (!scope.report.zone_specifique && field.zone_specifique) ||
                                    // On se trouve dans une zone spécifique, le champs n'appartient pas à la zone spécifique et le champs ne fait pas partie du ref national
                                    (scope.report.zone_specifique &&
                                        scope.report.zone_specifique !== field.zone_specifique &&
                                        field.zone_specifique) ||
                                    // Le champs est taggé comme masqué dans les metadata
                                    (field.id in masked_fields && !masked_fields[field.id].visible)
                                ) {
                                    fields[f] = scope.report.activity.tabs[tab].fields[f];
                                    //scope.report.activity.tabs[tab].fields.splice(f, 1);
                                }
                            }
                            scope.report.activity.tabs[tab].fields = fields;
                        }
                        /*************************************** */

                        if (!scope.$$phase) {
                            scope.$apply();
                        }
                        applyDefaultValues();
                        //bidouille();

                        $("#multireport").modal("toggle");
                    })
                    .addTo(G3ME.map);
            }

            function createMarker(asset) {
                scope.intent.assets_by_id[asset.id] = asset;
                asset.currentState = 0;
                L.marker(Asset.getCenter(asset), {
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
                            angular.copy(reports[asset.id]) ||
                            new Report(
                                asset.id,
                                scope.intent.multi_report_activity.id,
                                scope.intent.multi_report_mission
                            );
                        for (var i in scope.report.activity._fields) {
                            field = scope.report.activity._fields[i];
                            scope.report.fields[field.id] = scope.report.fields[field.id] || "";
                        }

                        /***************************************
                         * Gestion des zones spécifiques
                         ***************************************/
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

                        var masked_fields = {};
                        if (
                            scope.report.zone_specifique &&
                            scope.report.zone_specifique in Site.current.zones_specifiques_fields
                        ) {
                            // On teste la presence de la zone specifique dans le filtrage des champs
                            masked_fields = Site.current.zones_specifiques_fields[scope.report.zone_specifique];
                        }

                        for (var tab = 0; tab < scope.report.activity.tabs.length; tab++) {
                            var fields = {};
                            for (var field_idx in scope.report.activity.tabs[tab].fields) {
                                var field = scope.report.activity.tabs[tab].fields[field_idx];
                                if (
                                    // On ne se trouve pas dans une zone spécifique et il s'agit d'un champs spécifique
                                    !(!scope.report.zone_specifique && field.zone_specifique) &&
                                    // On se trouve dans une zone spécifique, le champs n'appartient pas à la zone spécifique et le champs ne fait pas partie du ref national
                                    !(
                                        scope.report.zone_specifique &&
                                        scope.report.zone_specifique !== field.zone_specifique &&
                                        field.zone_specifique
                                    ) &&
                                    // Le champs est taggé comme masqué dans les metadata
                                    !(field.id in masked_fields && !masked_fields[field.id].visible)
                                ) {
                                    fields[field_idx] = scope.report.activity.tabs[tab].fields[field_idx];
                                }
                            }
                            scope.report.activity.tabs[tab].fields = fields;
                        }
                        /****************************************/

                        if (!scope.$$phase) {
                            scope.$apply();
                        }
                        for (var i = 0; i < scope.report.assets.length; i++) {
                            scope.assets.push(new Asset(scope.report.assets[i]));
                        }
                        applyDefaultValues();
                        bidouille();

                        unwatch_report_ged = scope.$watch("report.ged", function(n, o) {
                            scope.reportForm.$setDirty();
                        });

                        $("#multireport").modal("toggle");
                    })
                    .addTo(G3ME.map);
            }

            /**
             * @name save
             * @return Sauvegarde le rapport courant en attendant la synchro
             */
            function save() {
                reports[scope.report.assets[0] || scope.report.latlng] = scope.report;
                close();
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
            function close() {
                if (unwatch_report_ged) {
                    unwatch_report_ged();
                }
                scope.report = null;
                scope.assets = [];
                scope.reportForm.$setPristine();
                $("#multireport").modal("toggle");
                Smartgeo._removeEventListener("backbutton", cancel);
                Smartgeo._addEventListener("backbutton", Intents.end);
            }
        }
    }
})();
