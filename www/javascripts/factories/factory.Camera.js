(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Camera', CameraFactory );

    function CameraFactory() {

        /**
         * @class CameraFactory
         * @desc Factory de la classe Camera
         */
        var Camera = {};

        /**
         * @name snapPicture
         * @desc Prend une photo
         * @param {Function} callback
         */
        Camera.snap = function(callback) {
            navigator.getMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

            if (navigator.getMedia && !navigator.camera) {
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
                            callback( canvasElement.toDataURL( "image/jpeg", 0.75 ) );
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
                    callback( canvas.toDataURL( "image/jpeg", 0.75 ) );
                }, false );

            } else if (navigator.camera) {
                navigator.camera.getPicture( function(imageURI) {
                    callback( imageURI );
                }, function() {}, {
                    quality: 100,
                    sourceType: navigator.camera.PictureSourceType.CAMERA,
                    mediaType: navigator.camera.MediaType.PICTURE,
                    destinationType: navigator.camera.DestinationType.FILE_URI,
                    targetWidth: 1024,
                    correctOrientation: true,
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
                    callback( canvas.toDataURL( "image/jpeg", 0.75 ) );
                };
            }
        };

        return Camera;
    }

})();
