"use strict";
angular.module("angularSpinner", []).directive("usSpinner", ["$window",
    function (a) {
        return {
            scope: !0,
            link: function (b, c, d) {
                function e() {
                    b.spinner && (b.spinner.stop(), b.spinner = null);
                }
                b.spinner = null, b.$watch(d.usSpinner, function (d) {
                    e(), b.spinner = new a.Spinner(d), b.spinner.spin(c[0]);
                }, !0), b.$on("$destroy", function () {
                    e();
                })
            }
        }
    }
]);
