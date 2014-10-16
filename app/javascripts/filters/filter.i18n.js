 (function () {

     'use strict';

     angular
         .module('smartgeomobile')
         .filter('i18n', i18nFilter);

     i18nFilter.$inject = ['i18n'];

     /**
      * @desc Filtre pour l'internationalisation
      * @example <label>{{searchMessage | i18n}}</label>
      */

     function i18nFilter(i18n) {
         return i18n.get;
     }

 })();