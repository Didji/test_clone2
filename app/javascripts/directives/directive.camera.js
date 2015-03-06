(function() {

    "use strict";

    angular
        .module( 'smartgeomobile' )
        .directive( 'camera', camera );

    /**
     * @desc Directive pour la prise de photo
     * @example <button camera ng-model='report.ged'> <--! avec report.ged = [] -->
     */

    camera.$inject = ['Camera'];

    function camera(Camera) {
        return {
            restrict: "A",
            require: "ngModel",
            link: function(scope, elm, attrs, ctrl) {
                attrs = attrs;
                elm.on( "click", function() {
                    scope.$apply( function() {
                        scope.isTakingPhoto = true;
                    } );
                    //TODO(@gulian): Utiliser Camera.snap()
                    navigator.getMedia = (navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia);

                    if (window.SmartgeoChromium && SmartgeoChromium.launchCamera) {
                        if (!window.ChromiumCallbacks) {
                            window.ChromiumCallbacks = {};
                        }
                        window.ChromiumCallbacks[1] = function(path) {
                            var imageElement = document.createElement( "img" );
                            imageElement.src = path;
                            imageElement.onload = function() {
                                // On redimensionne l'image pour qu'elle soit inférieure à 800x600.
                                // Ceci est fait côté JS afin de ne pas écraser l'image initiale.
                                var maxSize = 800,
                                    imageWidth = imageElement.width,
                                    imageHeight = imageElement.height;
                                if (imageWidth > imageHeight) {
                                    if (imageWidth > maxSize) {
                                        imageHeight *= maxSize / imageWidth;
                                        imageWidth = maxSize;
                                    }
                                } else {
                                    if (imageHeight > maxSize) {
                                        imageWidth *= maxSize / imageHeight;
                                        imageHeight = maxSize;
                                    }
                                }
                                var canvasElement = document.createElement( "canvas" );
                                canvasElement.width = imageWidth;
                                canvasElement.height = imageHeight;
                                canvasElement.getContext( "2d" ).drawImage( imageElement, 0, 0, imageWidth, imageHeight );
                                scope.$apply( function() {
                                    ctrl.$viewValue = ctrl.$viewValue || [];
                                    ctrl.$viewValue.push( {
                                        content: canvasElement.toDataURL( "image/jpeg" )
                                    } );
                                    scope.isTakingPhoto = false;
                                } );
                            };
                            window.ChromiumCallbacks[3] = function() {
                                scope.$apply( function() {
                                    scope.isTakingPhoto = false;
                                } );
                            };
                        };
                        window.ChromiumCallbacks[3] = function() {
                            scope.$apply( function() {
                                scope.isTakingPhoto = false;
                            } );
                        };
                        SmartgeoChromium.launchCamera( 1 );

                    } else if (navigator.getMedia) {
                        var streaming = false,
                            video = document.createElement( "video" ),
                            canvas = document.createElement( "canvas" ),
                            width = 320,
                            height = 0;

                        navigator.getMedia( {
                            video: true,
                            audio: false
                        }, function(stream) {
                                if (navigator.mozGetUserMedia) {
                                    video.mozSrcObject = stream;
                                } else {
                                    var vendorURL = window.URL || window.webkitURL;
                                    video.src = vendorURL.createObjectURL( stream );
                                }
                                video.play();
                            }, function() {
                                var imageElement2 = document.createElement( "img" );
                                imageElement2.src = "http://placehold.it/350x150";
                                imageElement2.onload = function() {
                                    var canvasElement = document.createElement( "canvas" );
                                    canvasElement.width = imageElement2.width;
                                    canvasElement.height = imageElement2.height;
                                    canvasElement.getContext( "2d" ).drawImage( imageElement2, 0, 0 );
                                    scope.$apply( function() {
                                        ctrl.$viewValue = ctrl.$viewValue || [];
                                        ctrl.$viewValue.push( {
                                            content: canvasElement.toDataURL( "image/jpeg", 0.75 )
                                        } );
                                        scope.isTakingPhoto = false;
                                    } );
                                };
                            } );

                        video.addEventListener( "canplay", function() {
                            if (!streaming) {
                                height = video.videoHeight / (video.videoWidth / width);
                                video.setAttribute( "width", width );
                                video.setAttribute( "height", height );
                                canvas.setAttribute( "width", width );
                                canvas.setAttribute( "height", height );
                                streaming = true;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext( "2d" ).drawImage( video, 0, 0, width, height );

                            scope.$apply( function() {
                                ctrl.$viewValue = ctrl.$viewValue || [];
                                ctrl.$viewValue.push( {
                                    content: canvas.toDataURL( "image/jpeg", 0.75 )
                                } );
                                scope.isTakingPhoto = false;
                            } );

                        }, false );

                    } else if (navigator.camera) {
                        navigator.camera.getPicture( function(imageURI) {
                            scope.$apply( function() {
                                ctrl.$viewValue = ctrl.$viewValue || [];
                                ctrl.$viewValue.push( {
                                    content: imageURI
                                } );
                                scope.isTakingPhoto = false;
                            } );
                        }, function() {
                                ctrl.$setValidity( "error", false );
                            }, {
                                quality: 100,
                                sourceType: attrs.camera === "gallery" ? navigator.camera.PictureSourceType.PHOTOLIBRARY : navigator.camera.PictureSourceType.CAMERA,
                                mediaType: navigator.camera.MediaType.PICTURE,
                                destinationType: navigator.camera.DestinationType.FILE_URI,
                                correctOrientation: false,
                                saveToPhotoAlbum: true
                            } );
                    } else {
                        var img = document.createElement( "img" );
                        img.src = "http://placehold.it/350x150";
                        img.onload = function() {
                            var canvasElement2 = document.createElement( "canvas" );
                            canvasElement2.width = img.width;
                            canvasElement2.height = img.height;
                            canvasElement2.getContext( "2d" ).drawImage( img, 0, 0 );
                            scope.$apply( function() {
                                ctrl.$viewValue = ctrl.$viewValue || [];
                                ctrl.$viewValue.push( {
                                    content: canvasElement2.toDataURL( "image/jpeg", 0.75 )
                                } );
                                scope.isTakingPhoto = false;
                            } );
                        };
                    }
                } );
            }
        };
    }

})();
