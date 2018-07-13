angular.module("smartgeomobile").factory("ConnectionService", function(i18n) {
    var service = {
        states: {
            "2g": i18n.get("_CONNTYPE_2G_"),
            "3g": i18n.get("_CONNTYPE_3G_"),
            "4g": i18n.get("_CONNTYPE_4G_"),
            cellular: i18n.get("_CONNTYPE_CELLULAR_"),
            ethernet: i18n.get("_CONNTYPE_ETHERNET_"),
            none: i18n.get("_CONNTYPE_NONE_"),
            unknown: i18n.get("_CONNTYPE_UNKNOWN_"),
            wifi: i18n.get("_CONNTYPE_WIFI_")
        },
        getState: function() {
            // Fonction integré à cordova connection-info
            return service.states[navigator.connection.type];
        },

        isConnected: function() {
            return !(navigator.connection.type === "none");
        }
    };

    return service;
});
