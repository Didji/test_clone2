angular.module('smartgeomobile').factory('i18n', function(Smartgeo){
    var i18n = {

        // OVERRIDE_LANGUAGE : 'en',

        label: {
            'en' : {
                _AUTH_LOG_MESSAGE_INIT_             : 'Initialization',
                _AUTH_LOG_MESSAGE_REMOTE_           : 'Remote login',
                _AUTH_LOG_MESSAGE_LOCAL_            : 'Local login',
                _AUTH_LOG_MESSAGE_CHECK_            : 'Checking server',
                _AUTH_FORGET_PASSWORD_              : 'Forget password',
                _AUTH_SETTINGS_                     : 'Settings',
                _AUTH_CHANGE_GIMAP_URL_             : 'Change remote server',
                _AUTH_REMEMBER_PASSWORD_            : 'Remember password',
                _AUTH_INIT_WITHOUT_NETWORK_ERROR_   : "Offline mode is not available for %s."
            },
            'fr' : {
                _AUTH_LOG_MESSAGE_INIT_             : 'Initialisation',
                _AUTH_LOG_MESSAGE_REMOTE_           : 'Connexion distante',
                _AUTH_LOG_MESSAGE_LOCAL_            : 'Connexion locale',
                _AUTH_LOG_MESSAGE_CHECK_            : 'Vérification du serveur',
                _AUTH_FORGET_PASSWORD_              : 'Oublier le mot de passe enregistré',
                _AUTH_SETTINGS_                     : 'Paramètres',
                _AUTH_CHANGE_GIMAP_URL_             : 'Changer de serveur',
                _AUTH_REMEMBER_PASSWORD_            : 'Se souvenir du mot de passe',
                _AUTH_INIT_WITHOUT_NETWORK_ERROR_   : "Le mode déconnecté n'est pas disponible pour %s car il ne s'est jamais authentifié en mode connecté."
            }
        },
        get : function(key, args){
            var lang = i18n.OVERRIDE_LANGUAGE || navigator.language || 'fr' ;
            if(!args){
                return i18n.label[lang] && i18n.label[lang][key] ;
            } else {
                var s = i18n.label[lang] && i18n.label[lang][key], i = 0;
                while(s && s.indexOf('%s') !== -1 && i < args.length){
                    s = s.replace('%s', args[i++]) ;
                }
                return s ;
            }
        }
    };
    return i18n ;
});

angular.module('smartgeomobile').directive('i18n', ['i18n', function (i18n) {
    return {
        restrict: 'EA',
        replace : true,
        link: function (scope, element, attribute) {
            if (element.html()) {
                element.html(i18n.get(element.html()));
            }
        }
    };
}]);

angular.module('smartgeomobile').filter('i18n', ['i18n', function(i18n) {
    return function(s) {
        return i18n.get(s);
    };
}]);
