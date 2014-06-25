window.smartgeo_i18n_lang = {};

angular.module('smartgeomobile').factory('i18n', function () {

    'use strict';

    var i18n = {
        OVERRIDE_LANGUAGE: 'fr',
        SELECTED_LANGUAGE: null,
        SYSTEM_LANGUAGE: navigator.language.slice(0, 2),
        FALLBACK_LANGUAGE: 'fr',
        UNTRANSLATED_CHAR: '≠',
        MISSING_ARG_CHAR: 'Ø',
        lang: function () {
            return this.CACHE ||
                (this.label[this.OVERRIDE_LANGUAGE] && (this.CACHE = this.OVERRIDE_LANGUAGE)) ||
                (this.label[this.SELECTED_LANGUAGE] && (this.CACHE = this.SELECTED_LANGUAGE)) ||
                (this.label[this.SYSTEM_LANGUAGE]   && (this.CACHE = this.SYSTEM_LANGUAGE))   ||
                (this.label[this.FALLBACK_LANGUAGE] && (this.CACHE = this.FALLBACK_LANGUAGE));
        },
        label: window.smartgeo_i18n_lang,
        get: function (key) {
            var s = i18n.label[i18n.lang()] && i18n.label[i18n.lang()][key.trim()],
                i = 0,
                args = [];
            for (var j = 1; j < arguments.length; j++) {
                args.push(arguments[j]);
            }
            while (args && s && s.indexOf('%s') !== -1 && i < args.length) {
                s = s.replace('%s', args[i++] || this.MISSING_ARG_CHAR);
            }
            return (s === undefined && key !== undefined ? this.UNTRANSLATED_CHAR : s);
        },
        select: function (lang) {
            if (this.label[lang]) {
                this.CACHE = null;
                this.SELECTED_LANGUAGE = lang;
            } else {
                throw 'Language unavailable';
            }
        }
    };
    return i18n;
}).directive('i18n', ['i18n',
    function (i18n) {
        return {
            restrict: 'E',
            link: function (scope, element) {
                (element.html() && element).html(i18n.get(element.html()));
            }
        };
    }
]).filter('i18n', ['i18n',
    function (i18n) {
        return i18n.get;
    }
]);
