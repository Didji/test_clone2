(function() {
    "use strict";

    angular.module("smartgeomobile").factory("Intents", IntentsFactory);

    IntentsFactory.$inject = ["$rootScope", "Storage"];

    function IntentsFactory($rootScope, Storage) {
        /**
         * @class IntentsFactory
         * @desc Factory de la classe Intents
         */
        var Intents = {};

        /**
         * @name
         * @desc
         */
        Intents.parse = function(intent) {
            var data = intent.replace("gimap:/", "/intent").split("&redirect=");
            var redirect = null;
            if (data.length > 1) {
                redirect = data[1];
            }
            data = data[0].split("?");
            var params = data[1].split("&");
            var appendedParams = false;
            var allParams = {
                target: "map_target,report_target",
                marker: "map_marker",
                zoom: "map_zoom,multi_report_zoom",
                redirect: "report_url_redirect,multi_report_redirect",
                activity: "report_activity,map_activity,multi_report_activity",
                mission: "report_mission,multi_report_mission",
                fields: "report_fields",
                assets: "multi_report_target,report_assets",
                center: "map_target,multi_report_center",
                outmsg: "multi_report_outmsg",
                installationsTraitees: "done_asset"
            };
            var url = data[0];
            if (params != null && params.length > 0) {
                url += "?";
                appendedParams = true;
                var callbackParam = "";
                for (var i = 0; i < params.length; i++) {
                    var composite = false;
                    var param = params[i].split("=");
                    var paramName = param[0];
                    // On ignore les parametres de callback mais on les ajoute en fin d'URL
                    if (paramName === "[LABEL_INDEXED_FIELDS]" || paramName === "[KEY_INDEXED_FIELDS]") {
                        callbackParam = paramName;
                        continue;
                    }
                    //Est ce un champ composé? (exemple : fields[###564654###]=250
                    var matcher = paramName.match(/^(.+)(\[.+\])$/);
                    if (matcher != null && matcher.length > 1) {
                        composite = true;
                        paramName = matcher[1];
                    }
                    var destParams = allParams[paramName].split(",");
                    for (var j = 0; j < destParams.length; j++) {
                        url += destParams[j];
                        if (composite) {
                            url += matcher[2];
                        }
                        if (param.length <= 1) {
                            url += "=";
                        } else {
                            url += "=" + param[1];
                        }

                        //ajout du "&" si plusieurs paramètres cible pour le paramètre source courant
                        if (j < destParams.length - 1) {
                            url += "&";
                        }
                    }
                    //ajout du "&" s'il reste des paramètres dans la query principale
                    if (i < params.length - 1) {
                        url += "&";
                    }
                }
                url += callbackParam;
            }
            if (redirect !== null) {
                url += "&report_url_redirect=" + redirect + "&multi_report_redirect=" + redirect;
                $rootScope.fromFDR = true;
            }
            return url;
        };

        Intents.end = function() {
            if ($rootScope.fromIntent === true) {
                $rootScope.fromIntent = false;
                var intent = Storage.get("intent");
                if (intent !== null) {
                    Storage.remove("intent");
                }
                if ($rootScope.fromFDR === true) {
                    window.plugins.launchmyapp.returnToPreviousActitivy(null, angular.noop, angular.noop);
                    return;
                }
                window.plugins.launchmyapp.finishActivity(null, angular.noop, angular.noop);
            }
        };

        return Intents;
    }
})();
