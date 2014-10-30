(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .filter('timeago', Timeago);

    function Timeago() {

        /**
         * @name timeago
         * @desc Timeago filter
         */
        function timeago(input, PAllowFuture) {
            var nowTime = (new Date()).getTime(),
                date = (new Date(input)).getTime(),
                dateDifference = nowTime - date,
                substitute = function (stringOrFunction, number, strings) {
                    var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, dateDifference) : stringOrFunction;
                    var value = (strings.numbers && strings.numbers[number]) || number;
                    return string.replace(/%d/i, value);
                },
                allowFuture = !!PAllowFuture,
                strings = {
                    prefixAgo: null,
                    prefixFromNow: null,
                    suffixAgo: null,
                    suffixFromNow: null,
                    seconds: "moins d'une minute",
                    minute: "une minute",
                    minutes: "%d minutes",
                    hour: "une heure",
                    hours: "%d heures",
                    day: "un jour",
                    days: "%d jours",
                    month: "un mois",
                    months: "%d mois",
                    year: "un an",
                    years: "%d ans"
                },
                words,
                seconds = Math.abs(dateDifference) / 1000,
                minutes = seconds / 60,
                hours = minutes / 60,
                days = hours / 24,
                years = days / 365,
                separator = strings.wordSeparator === undefined ? " " : strings.wordSeparator,
                prefix = strings.prefixAgo,
                suffix = strings.suffixAgo;

            if (allowFuture && dateDifference < 0) {
                prefix = strings.prefixFromNow;
                suffix = strings.suffixFromNow;
            }

            words = seconds < 45 && substitute(strings.seconds, Math.round(seconds), strings) ||
                seconds < 90 && substitute(strings.minute, 1, strings) ||
                minutes < 45 && substitute(strings.minutes, Math.round(minutes), strings) ||
                minutes < 90 && substitute(strings.hour, 1, strings) ||
                hours < 24 && substitute(strings.hours, Math.round(hours), strings) ||
                hours < 42 && substitute(strings.day, 1, strings) ||
                days < 30 && substitute(strings.days, Math.round(days), strings) ||
                days < 45 && substitute(strings.month, 1, strings) ||
                days < 365 && substitute(strings.months, Math.round(days / 30), strings) ||
                years < 1.5 && substitute(strings.year, 1, strings) ||
                substitute(strings.years, Math.round(years), strings);

            return $.trim([prefix, words, suffix].join(separator));
        }

        return timeago;

    }

})();
