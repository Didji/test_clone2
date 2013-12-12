var smartgeomobile = angular.module('smartgeomobile', ['ngRoute','ui.bootstrap', 'ui.select2', 'angularSpinner'])
       .config(['$routeProvider', function($routeProvider, $rootScope) {

            $routeProvider.
                when('/',                                       {templateUrl: 'partials/login.html'}).
                when('/sites/',                                 {templateUrl: 'partials/sites.html'}).

                when('/report/:site',                           {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity',                 {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity/:assets',         {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity/:assets/:mission',{templateUrl: 'partials/report.html'}).

                when('/sites/install/:site',                    {templateUrl: 'partials/installation.html'}).
                when('/sites/uninstall/:site',                  {templateUrl: 'partials/uninstall.html'}).
                when('/sites/update/:site',                     {templateUrl: 'partials/update.html'}).
                when('/map/:site',                              {templateUrl: 'partials/map.html'}).
                when('/intent/:controller/?:args',              {templateUrl: "partials/intent.html"}).

                otherwise({template: " ",  controller: function($location){
                    console.log($location.url());
                    $location.path("/");
                }});

    }]).config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.withCredentials = true;
        $httpProvider.defaults.useXDomain = true;
        $httpProvider.defaults.cache = false;
    }]).directive('camera', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                elm.on('click', function() {
                    scope.$apply(function(){
                        scope.isTakingPhoto = true ;
                    })
                    navigator.getMedia = ( navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

                    if (window.SmartgeoChromium && SmartgeoChromium.launchCamera){
                        if(!window.ChromiumCallbacks){
                            window.ChromiumCallbacks = [];
                        }
                        window.ChromiumCallbacks[1] = function(path){
                            console.log(path);
                            var img = document.createElement("img");
                            img.src = path;
                            img.onload = function(){
                                var canvas = document.createElement("canvas");
                                canvas.width = img.width;
                                canvas.height = img.height;
                                canvas.getContext("2d").drawImage(img, 0, 0);
                                scope.$apply(function(){
                                    ctrl.$viewValue=ctrl.$viewValue||[];
                                    ctrl.$viewValue.push({
                                        content:canvas.toDataURL("image/png")
                                    });
                                scope.isTakingPhoto = false ;
                                });
                            };
                        };
                        window.ChromiumCallbacks[3] = function(){
                            scope.$apply(function(){
                                scope.isTakingPhoto = false ;
                            });
                        };
                        SmartgeoChromium.launchCamera(1);

                    } else if(navigator.getMedia){
                        var streaming = false,
                            video     = document.createElement("video");
                            canvas    = document.createElement("canvas");
                            width     = 320,
                            height    = 0;

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
                                console.log("An error occured! " , err);
                                 var img = document.createElement("img");
                                img.src = 'http://placehold.it/350x150';
                                img.onload = function(){
                                    var canvas = document.createElement("canvas");
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    canvas.getContext("2d").drawImage(img, 0, 0);
                                    scope.$apply(function(){
                                        ctrl.$viewValue=ctrl.$viewValue||[];
                                        ctrl.$viewValue.push({
                                            content:canvas.toDataURL("image/png")
                                        });
                                        scope.isTakingPhoto = false ;
                                    });
                                };
                            }
                        );

                        video.addEventListener('canplay', function(ev){
                            if (!streaming) {
                                height = video.videoHeight / (video.videoWidth/width);
                                video.setAttribute('width', width);
                                video.setAttribute('height', height);
                                canvas.setAttribute('width', width);
                                canvas.setAttribute('height', height);
                                streaming = true;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext('2d').drawImage(video, 0, 0, width, height);

                            scope.$apply(function(){
                                ctrl.$viewValue=ctrl.$viewValue||[];
                                ctrl.$viewValue.push({
                                    content:canvas.toDataURL("image/png")
                                });
                                scope.isTakingPhoto = false ;
                            });

                        }, false);

                    } else if(navigator.camera){
                        navigator.camera.getPicture(function (imageURI) {
                            scope.$apply(function(){
                                ctrl.$viewValue=ctrl.$viewValue||[];
                                ctrl.$viewValue.push({
                                    content:imageURI
                                });
                                scope.isTakingPhoto = false ;
                            });
                        }, function (err) {
                            ctrl.$setValidity('error', false);
                        },{
                            quality: 50,
                            quality: 100,
                            sourceType: navigator.camera.PictureSourceType.CAMERA,
                            mediaType: navigator.camera.MediaType.PICTURE,
                            destinationType: Camera.DestinationType.FILE_URI,
                            correctOrientation: false,
                            saveToPhotoAlbum: true
                        });
                    } else {
                        var img = document.createElement("img");
                        img.src = 'http://placehold.it/350x150';
                        img.onload = function(){
                            var canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            canvas.getContext("2d").drawImage(img, 0, 0);
                            scope.$apply(function(){
                                ctrl.$viewValue=ctrl.$viewValue||[];
                                ctrl.$viewValue.push({
                                    content:canvas.toDataURL("image/png")
                                });
                                scope.isTakingPhoto = false ;
                            });
                        };
                    }
                });
            }
        };
    }).filter('timeago', function() {
        return function(input, p_allowFuture) {
            var substitute = function(stringOrFunction, number, strings) {
                var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, dateDifference) : stringOrFunction;
                var value = (strings.numbers && strings.numbers[number]) || number;
                return string.replace(/%d/i, value);
            },
                nowTime = (new Date()).getTime(),
                date = (new Date(input)).getTime(),
                //refreshMillis= 6e4, //A minute
                allowFuture = p_allowFuture || false,
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
                dateDifference = nowTime - date,
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
