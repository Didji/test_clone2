(function() {
    "use strict";

    angular.module("smartgeomobile").directive("camera", camera);

    /**
     * @desc Directive pour la prise de photo
     * @example <button camera ng-model='report.ged'> <--! avec report.ged = [] -->
     */

    camera.$inject = ["Camera"];

    function camera() {
        return {
            restrict: "A",
            require: "ngModel",
            link: function(scope, elm, attrs, ctrl) {
                attrs = attrs;
                elm.on("click", function() {
                    scope.$apply(function() {
                        scope.isTakingPhoto = true;
                    });
                    //TODO(@gulian): Utiliser Camera.snap()
                    navigator.getMedia =
                        navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia;

                    if (navigator.getMedia && !navigator.camera) {
                        var streaming = false,
                            video = document.createElement("video"),
                            canvas = document.createElement("canvas"),
                            width = 320,
                            height = 0;

                        navigator.getMedia(
                            {
                                video: true,
                                audio: false
                            },
                            function(stream) {
                                if (navigator.mozGetUserMedia) {
                                    video.mozSrcObject = stream;
                                } else {
                                    var vendorURL = window.URL || window.webkitURL;
                                    video.src = vendorURL.createObjectURL(stream);
                                }
                                video.play();
                            },
                            function() {
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
                            }
                        );

                        video.addEventListener(
                            "canplay",
                            function() {
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
                            },
                            false
                        );
                    } else if (navigator.camera) {
                        navigator.camera.getPicture(
                            function(imageURI) {
                                scope.$apply(function() {
                                    ctrl.$viewValue = ctrl.$viewValue || [];
                                    ctrl.$viewValue.push({
                                        content: imageURI
                                    });
                                    scope.isTakingPhoto = false;
                                });
                            },
                            function(error) {
                                scope.$apply(function() {
                                    scope.isTakingPhoto = false;
                                });
                                console.error('Unable to take picture: "' + error + '"');
                            },
                            {
                                quality: 100,
                                sourceType:
                                    attrs.camera === "gallery"
                                        ? navigator.camera.PictureSourceType.SAVEDPHOTOALBUM
                                        : navigator.camera.PictureSourceType.CAMERA,
                                mediaType: navigator.camera.MediaType.PICTURE,
                                destinationType: navigator.camera.DestinationType.FILE_URI,
                                targetWidth: 1024,
                                allowEdit: true,
                                correctOrientation: true,
                                saveToPhotoAlbum: true
                            }
                        );
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
    }
})();
