var smartgeomobile = angular.module('smartgeomobile', ['ngRoute','ui.bootstrap', 'ui.select2'])
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
                when('/intent/:controller/?:args',              {template: " ",  controller: 'intentController'}).

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
                                });
                            };
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
                            });

                        }, false);

                    } else if(navigator.camera){
                        navigator.camera.getPicture(function (imageURI) {
                            scope.$apply(function(){
                                ctrl.$viewValue=ctrl.$viewValue||[];
                                ctrl.$viewValue.push({
                                    content:imageURI
                                });
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
                            });
                        };
                    }
                });
            }
        };
    });
