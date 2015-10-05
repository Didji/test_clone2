(function() {



    "use strict";
    angular.module( "ngLocale", [], ["$provide", function(a) {
            var b = {
                ZERO: "zero",
                ONE: "one",
                TWO: "two",
                FEW: "few",
                MANY: "many",
                OTHER: "other"
            };
            a.value( "$locale", {
                DATETIME_FORMATS: {
                    AMPMS: ["AM", "PM"],
                    DAY: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
                    MONTH: ["janvier", "f\xe9vrier", "mars", "avril", "mai", "juin", "juillet", "ao\xfbt", "septembre", "octobre", "novembre", "d\xe9cembre"],
                    SHORTDAY: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
                    SHORTMONTH: ["janv.", "f\xe9vr.", "mars", "avr.", "mai", "juin", "juil.", "ao\xfbt", "sept.", "oct.", "nov.", "d\xe9c."],
                    fullDate: "EEEE d MMMM y",
                    longDate: "d MMMM y",
                    medium: "d MMM y HH:mm:ss",
                    mediumDate: "d MMM y",
                    mediumTime: "HH:mm:ss",
                    "short": "dd/MM/yy HH:mm",
                    shortDate: "dd/MM/yy",
                    shortTime: "HH:mm"
                },
                NUMBER_FORMATS: {
                    CURRENCY_SYM: "\u20ac",
                    DECIMAL_SEP: ",",
                    GROUP_SEP: "\xa0",
                    PATTERNS: [{
                        gSize: 3,
                        lgSize: 3,
                        macFrac: 0,
                        maxFrac: 3,
                        minFrac: 0,
                        minInt: 1,
                        negPre: "-",
                        negSuf: "",
                        posPre: "",
                        posSuf: ""
                        }, {
                        gSize: 3,
                        lgSize: 3,
                        macFrac: 0,
                        maxFrac: 2,
                        minFrac: 2,
                        minInt: 1,
                        negPre: "(",
                        negSuf: "\xa0\xa4)",
                        posPre: "",
                        posSuf: "\xa0\xa4"
                    }]
                },
                id: "fr-fr",
                pluralCat: function(a) {
                    return a >= 0 && 2 >= a && 2 !== a ? b.ONE : b.OTHER;
                }
            } );
    }] );
})();
