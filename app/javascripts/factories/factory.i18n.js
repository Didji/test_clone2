(function() {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('i18n', i18n);

    /**
     * @class i18n
     * @desc Factory pour l'internationalisation
     *
     * @property {String} OVERRIDE_LANGUAGE Language d'écrasement
     * @property {String} SYSTEM_LANGUAGE   Language du système
     * @property {String} FALLBACK_LANGUAGE Language de secours si aucun language n'est trouvé
     * @property {String} UNTRANSLATED_CHAR Caractère à utiliser si la traduction n'est pas trouvée
     * @property {String} MISSING_ARG_CHAR  Caractère à utiliser si la traduction utilise un paramètre non fourni
     * @property {String} labels Dictionnaire
     */

    function i18n() {

        var i18n = {};

        i18n.OVERRIDE_LANGUAGE = 'fr';
        i18n.SYSTEM_LANGUAGE   = navigator.language.slice(0, 2);
        i18n.FALLBACK_LANGUAGE = 'fr';
        i18n.UNTRANSLATED_CHAR = '≠';
        i18n.MISSING_ARG_CHAR  = 'Ø',
        i18n.labels = window.smartgeo_i18n_lang,

        /**
         * @name lang
         * @desc Cherche et met en cache la langue à utiliser pour l'internationalisation
         * @returns {String}
         */
        i18n.lang = function() {
            return i18n.CACHE ||
                (i18n.labels[i18n.OVERRIDE_LANGUAGE] && (i18n.CACHE = i18n.OVERRIDE_LANGUAGE)) ||
                (i18n.labels[i18n.SYSTEM_LANGUAGE] && (i18n.CACHE = i18n.SYSTEM_LANGUAGE)) ||
                (i18n.labels[i18n.FALLBACK_LANGUAGE] && (i18n.CACHE = i18n.FALLBACK_LANGUAGE));
        };

        /**
         * @name get
         * @desc Traduit la clef passée en paramètre. Cette methode est utilisée par le Filter et la Directive i18n
         * @param {String} key Valeur à chercher
         * @returns {String}
         */
        i18n.get = function(key) {
            if(!key || key.trim().length === 0){
                return;
            }
            var s = i18n.labels[i18n.lang()] && i18n.labels[i18n.lang()][key && key.trim()],
                i = 0, j=1, args = [];
            for (; j < arguments.length; j++) {
                args.push(arguments[j]);
            }
            while (args && s && s.indexOf('%s') !== -1 && i < args.length) {
                s = s.replace('%s', args[i++] || i18n.MISSING_ARG_CHAR);
            }
            return (s === undefined && key !== undefined ? i18n.UNTRANSLATED_CHAR : s);
        };

        return i18n;
    }

})();