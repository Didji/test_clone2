/*global window, angular, navigator, SmartgeoChromium, document, console, Camera, $  */


angular.module("smartgeobootstrap", []).run(function() {
    window.smartgeoPersistenceSQLite.get('sites', function(sites) {
        window.smartgeoPersistenceCache_ = {
            sites: sites
        };
        angular.bootstrap(document, ['smartgeomobile']);
    });
});


var smartgeomobile = angular.module("smartgeomobile", ["ngRoute", "ui.bootstrap", "ui.select2", "angularSpinner", 'pasvaz.bindonce', 'ngResource'])
    .config(["$routeProvider", "$rootScopeProvider", "$httpProvider",
        function($routeProvider, $rootScope, $httpProvider) {


            "use strict";

            $routeProvider.
            when("/", {
                templateUrl: "partials/login.html"
            }).
            when("/sites/", {
                templateUrl: "partials/sites.html"
            }).

            when("/report/:site", {
                templateUrl: "partials/report.html"
            }).
            when("/report/:site/:activity", {
                templateUrl: "partials/report.html"
            }).
            when("/report/:site/:activity/:assets", {
                templateUrl: "partials/report.html"
            }).
            when("/report/:site/:activity/:assets/:mission", {
                templateUrl: "partials/report.html"
            }).

            when("/report/:site/undefined/:assets/:mission", {
                templateUrl: "partials/report.html"
            }).

            when("/register", {
                templateUrl: "partials/register.html"
            }).
            when("/licenseRevoked", {
                templateUrl: "partials/licenseRevoked.html"
            }).

            when("/sites/install/:site", {
                templateUrl: "partials/installation.html"
            }).
            when("/sites/uninstall/:site", {
                templateUrl: "partials/uninstall.html"
            }).
            when("/sites/update/:site", {
                templateUrl: "partials/update.html"
            }).
            when("/map/:site", {
                templateUrl: "partials/map.html"
            }).
            when("/intent/:controller/?:args", {
                templateUrl: "partials/intent.html"
            }).

            otherwise({
                template: " ",
                controller: function($location) {
                    $location.path("/");
                }
            });

            $httpProvider.defaults.withCredentials = true;
            $httpProvider.defaults.useXDomain = true;
            $httpProvider.defaults.cache = false;

        }
    ]).run(function($rootScope/*, LicenseManager*/) {
        // TODO: activer la licence + changer l'url du serveur dans app/javascripts/services/G3licService.js + supprimer la ligne suivante
        $rootScope.rights = {
            census : true,
            consultation : true,
            search : true,
            logout : true,
            report : true,
            planning : true,
            photo : true,
            myposition : true,
            activelayers : true,
            goto : true,
            synccenter : true,
            _DONT_REALLY_RESET : false
        };

    }).directive("camera", function() {
        "use strict";
        return {
            restrict: "A",
            require: "ngModel",
            link: function(scope, elm, attrs, ctrl) {
                attrs = attrs;
                elm.on("click", function() {
                    scope.$apply(function() {
                        scope.isTakingPhoto = true;
                    });
                    navigator.getMedia = (navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia);

                    if (window.SmartgeoChromium && SmartgeoChromium.launchCamera) {
                        if (!window.ChromiumCallbacks) {
                            window.ChromiumCallbacks = [];
                        }
                        window.ChromiumCallbacks[1] = function(path) {
                            var imageElement = document.createElement("img");
                            imageElement.src = path;
                            imageElement.onload = function() {
                                var canvasElement = document.createElement("canvas");
                                canvasElement.width = imageElement.width;
                                canvasElement.height = imageElement.height;
                                canvasElement.getContext("2d").drawImage(imageElement, 0, 0);
                                scope.$apply(function() {
                                    ctrl.$viewValue = ctrl.$viewValue || [];
                                    ctrl.$viewValue.push({
                                        content: canvasElement.toDataURL("image/jpeg", 0.75)
                                    });
                                    scope.isTakingPhoto = false;
                                });
                            };
                            window.ChromiumCallbacks[3] = function() {
                                scope.$apply(function() {
                                    scope.isTakingPhoto = false;
                                });
                            };
                        };
                        window.ChromiumCallbacks[3] = function() {
                            scope.$apply(function() {
                                scope.isTakingPhoto = false;
                            });
                        };
                        SmartgeoChromium.launchCamera(1);

                    } else if (navigator.getMedia) {
                        var streaming = false,
                            video = document.createElement("video"),
                            canvas = document.createElement("canvas"),
                            width = 320,
                            height = 0;

                        navigator.getMedia({
                            video: true,
                            audio: false
                        }, function(stream) {
                            if (navigator.mozGetUserMedia) {
                                video.mozSrcObject = stream;
                            } else {
                                var vendorURL = window.URL || window.webkitURL;
                                video.src = vendorURL.createObjectURL(stream);
                            }
                            video.play();
                        }, function(err) {
                            var imageElement2 = document.createElement("img");
                            imageElement2.src = "http://placehold.it/350x150";
                            imageElement2.onload = function() {
                                var canvasElement = document.createElement("canvas");
                                canvasElement.width = imageElement2.width;
                                canvasElement.height = imageElement2.height;
                                canvasElement.getContext("2d").drawImage(imageElement2, 0, 0);
                                scope.$apply(function() {
                                    ctrl.$viewValue = ctrl.$viewValue || [];
                                    ctrl.$viewValue.push({
                                        content: canvasElement.toDataURL("image/jpeg", 0.75)
                                    });
                                    scope.isTakingPhoto = false;
                                });
                            };
                        });

                        video.addEventListener("canplay", function(ev) {
                            if (!streaming) {
                                height = video.videoHeight / (video.videoWidth / width);
                                video.setAttribute("width", width);
                                video.setAttribute("height", height);
                                canvas.setAttribute("width", width);
                                canvas.setAttribute("height", height);
                                streaming = true;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext("2d").drawImage(video, 0, 0, width, height);

                            scope.$apply(function() {
                                ctrl.$viewValue = ctrl.$viewValue || [];
                                ctrl.$viewValue.push({
                                    content: canvas.toDataURL("image/jpeg", 0.75)
                                });
                                scope.isTakingPhoto = false;
                            });

                        }, false);

                    } else if (navigator.camera) {
                        navigator.camera.getPicture(function(imageURI) {
                            scope.$apply(function() {
                                ctrl.$viewValue = ctrl.$viewValue || [];
                                ctrl.$viewValue.push({
                                    content: imageURI
                                });
                                scope.isTakingPhoto = false;
                            });
                        }, function(err) {
                            ctrl.$setValidity("error", false);
                        }, {
                            quality: 100,
                            sourceType: navigator.camera.PictureSourceType.CAMERA,
                            mediaType: navigator.camera.MediaType.PICTURE,
                            destinationType: Camera.DestinationType.FILE_URI,
                            correctOrientation: false,
                            saveToPhotoAlbum: true
                        });
                    } else {
                        var img = document.createElement("img");
                        img.src = "http://placehold.it/350x150";
                        img.onload = function() {
                            var canvasElement2 = document.createElement("canvas");
                            canvasElement2.width = img.width;
                            canvasElement2.height = img.height;
                            canvasElement2.getContext("2d").drawImage(img, 0, 0);
                            scope.$apply(function() {
                                ctrl.$viewValue = ctrl.$viewValue || [];
                                ctrl.$viewValue.push({
                                    content: canvasElement2.toDataURL("image/jpeg", 0.75)
                                });
                                scope.isTakingPhoto = false;
                            });
                        };
                    }
                });
            }
        };
    }).filter("timeago", function() {
        "use strict";
        return function(input, PAllowFuture) {
            var nowTime = (new Date()).getTime(),
                date = (new Date(input)).getTime(),
                dateDifference = nowTime - date,
                substitute = function(stringOrFunction, number, strings) {
                    var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, dateDifference) : stringOrFunction;
                    var value = (strings.numbers && strings.numbers[number]) || number;
                    return string.replace(/%d/i, value);
                },
                //refreshMillis= 6e4, //A minute
                allowFuture = PAllowFuture || false,
                // strings = {
                //     prefixAgo: null,
                //     prefixFromNow: null,
                //     suffixAgo: "ago",
                //     suffixFromNow: "from now",
                //     seconds: "less than a minute",
                //     minute: "about a minute",
                //     minutes: "%d minutes",
                //     hour: "about an hour",
                //     hours: "about %d hours",
                //     day: "a day",
                //     days: "%d days",
                //     month: "about a month",
                //     months: "%d months",
                //     year: "about a year",
                //     years: "%d years"
                // },
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

            if (allowFuture) {
                if (dateDifference < 0) {
                    prefix = strings.prefixFromNow;
                    suffix = strings.suffixFromNow;
                }
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
        };
    });
