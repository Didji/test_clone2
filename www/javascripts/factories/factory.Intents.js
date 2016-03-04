( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Intents', IntentsFactory );

    IntentsFactory.$inject = [];

    function IntentsFactory() {

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
            var data = intent.replace('gimap:/', '/intent').split('?');
            var params = data[1].split("&");
            var appendedParams = false;
            var allParams = {
                'target': 'map_target,report_target',
                'marker': 'map_marker',
                'zoom': 'map_zoom,multi_report_zoom',
                'redirect': 'report_url_redirect,multi_report_redirect',
                'activity': 'report_activity,map_activity,multi_report_activity',
                'mission': 'report_mission,multi_report_mission',
                'fields': 'report_fields',
                'assets': 'multi_report_target',
                'center': 'map_target,multi_report_center',
                'outmsg': 'multi_report_outmsg'
            };
            var url = data[0];
            if (params != null && params.length > 0) {
                url += "?";
                appendedParams = true;
                for (var i = 0; i < params.length; i++) {
                    var composite =  false;
                    var param = params[i].split('=');
                    var paramName = param[0];
                    //Est ce un champ composé? (exemple : fields[###564654###]=250
                    var matcher = paramName.match(/^(.+)(\\[.+\\])$/g);
                    if (matcher != null && matcher.length > 1) {
                        composite = true;
                        paramName = matcher[1];
                    }
                    var destParams = allParams[paramName].split(',');
                    for (var j = 0; j < destParams.length; j++) {
                        url += destParams[j];
                        if (composite) {
                            url += matcher[2];
                        }
                        if(param.length <= 1){
                            url += "=";
                        }else {
                            url += "=" + param[1];
                        }

                        //ajout du "&" si plusieurs paramètres cible pour le paramètre source courant
                        if (j < (destParams.length - 1)) {
                            url += "&";
                        }
                    }
                    //ajout du "&" s'il reste des paramètres dans la query principale
                    if (i < (params.length - 1)) {
                        url += "&";
                    }
                }
            }
            return url;
        };

        return Intents;
    }

} )();
