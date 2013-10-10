angular.module('smartgeomobile', ['ngRoute','ui.bootstrap', 'ui.select2'])
       .config(['$routeProvider', function($routeProvider) {
            $routeProvider.
                when('/',                                       {templateUrl: 'partials/login.html'}).
                when('/sites/',                                 {templateUrl: 'partials/sites.html'}).

                when('/report/:site',                           {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity',                 {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity/:assets',         {templateUrl: 'partials/report.html'}).

                when('/sites/install/:site',                    {templateUrl: 'partials/installation.html'}).
                when('/sites/uninstall/:site',                  {templateUrl: 'partials/uninstall.html'}).
                when('/sites/update/:site',                     {templateUrl: 'partials/update.html'}).
                when('/map/:site',                              {templateUrl: 'partials/map.html'}).
                otherwise({redirectTo: '/'});
    }]).config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.withCredentials = true;
        $httpProvider.defaults.useXDomain = true;
    }]).directive('camera', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                elm.on('click', function() {
                    if(! navigator.camera){
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
                        }
                    } else {
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
                    }
                });
            }
        };
    });
