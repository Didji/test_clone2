(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .directive('i18n', i18nDirective);

    i18nDirective.$inject = ['i18n'];

    /**
     * @desc Directive pour l'internationalisation
     * @example <i18n>_AUTH_REMEMBER_PASSWORD_</i18n>
     */

    function i18nDirective(i18n) {
        return {
            restrict: 'E',
            link: function (scope, element) {
                (element.html() && element).html(i18n.get(element.html()));
            }
        };
    }

})();
