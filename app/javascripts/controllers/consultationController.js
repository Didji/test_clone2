angular.module('smartgeomobile').controller('consultationController', function ($scope, $rootScope, $window, $location, Smartgeo, i18n, G3ME) {

    'use strict';

    $scope.state = 'closed';
    $scope.loading = false;
    angular.element($window).bind("resize", function (e) {
        $scope.open();
        $scope.close();
    });

    var PREOPEN_TIMER;

    $scope.$watch('loading', function () {
        var elt = $('.consultation-content')[0];
        elt.style.display = 'none';
        elt.offsetHeight = elt.offsetHeight;
        elt.style.display = 'block';
    });

    // Lorsque la carte nous informe qu'une consultation est demandée,
    // on prépare une ouverture du panneau de consultation. S'il n'y a
    // pas de résultat, on annulera cette ouverture.
    $scope.$on("CONSULTATION_CLICK_REQUESTED", function (e, coordinates) {
        $scope.coordinates = coordinates;
        if (PREOPEN_TIMER) {
            clearTimeout(PREOPEN_TIMER);
        }
        PREOPEN_TIMER = setTimeout(function () {
            $scope.loading = true;
            $scope.open();
            $scope.$apply();
        }, 200);
    });
    $scope.$on("CONSULTATION_CLICK_CANCELED", function () {
        if (PREOPEN_TIMER) {
            clearTimeout(PREOPEN_TIMER);
        }
        $scope.close();
        $scope.loading = false;
        $scope.$apply();
    });

    $scope.$on("CONSULTATION_OPEN_PANEL", function () {
        $scope.open();
        $scope.$apply();
    });

    $scope.$on("CONSULTATION_CLOSE_PANEL", function () {
        $scope.close();
    });

    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function (event, assets) {

        if (PREOPEN_TIMER) {
            clearTimeout(PREOPEN_TIMER);
        }

        $scope.groups = {};
        $scope.assets = assets;
        $scope.assets._byGuid = [];
        for (var i = 0; i < assets.length; i++) {
            if (!$scope.groups[assets[i].priority]) {
                $scope.groups[assets[i].priority] = {};
            }
            if (!$scope.groups[assets[i].priority][assets[i].okey]) {
                $scope.groups[assets[i].priority][assets[i].okey] = {};
            }
            $scope.assets._byGuid[assets[i].guid] = assets[i];
            $scope.groups[assets[i].priority][assets[i].okey][assets[i].guid] = assets[i];
        }
        $scope.open();
        $scope.loading = false;
        $scope.$apply();

        $rootScope.$broadcast("UNHIGHLIGHT_ALL_ASSET");

        $(".collapse").collapse({
            toggle: false
        });

        // $(document).on('show.bs.collapse', ".collapse", function(){
        //     $rootScope.$broadcast("HIGHLIGHT_ASSET", $scope.assets._byGuid[this.id.match(/collapse-(.*)/)[1]]);
        // }).on('hide.bs.collapse', ".collapse", function(){
        //     console.log('icii', $scope.assets._byGuid[this.id.match(/collapse-(.*)/)[1]]);
        //     $rootScope.$broadcast("UNHIGHLIGHT_ASSET", $scope.assets._byGuid[this.id.match(/collapse-(.*)/)[1]]);
        // });
    });

    $scope.gotoAsset = function (asset) {

        //   /!\ REFACTOR ALERT /!\
        // TODO : make polyfill class

        var coords = asset.geometry.type === "Point" ? {
            x: asset.geometry.coordinates[0],
            y: asset.geometry.coordinates[1]
        } : {
            x: asset.geometry.coordinates[0][0],
            y: asset.geometry.coordinates[0][1]
        };

        if (window.SmartgeoChromium && SmartgeoChromium.goTo && SmartgeoChromium.locate) {

            ChromiumCallbacks[0] = function (lng, lat, alt) {
                SmartgeoChromium.goTo(lng, lat, coords.x, coords.y);
            };

            ChromiumCallbacks[2] = function () {
                alertify.error(i18n.get("_CONSULTATION_GPS_FAIL"));
            };

            SmartgeoChromium.locate();

        } else {
            Smartgeo.getUsersLocation(function (fromLat, fromLng) {
                if (!navigator.userAgent.match(/Android/i) && !navigator.userAgent.match(/iPhone/i) && !navigator.userAgent.match(/iPad/i)) {
                    window.open("http://maps.apple.com/?saddr=" + fromLat + "," + fromLng + "&daddr=" + coords.y + "," + coords.x);
                } else {
                    cordova.exec(null, function () {
                        alertify.error(i18n.get("_CONSULTATION_GPS_FAIL"));
                    }, "gotoPlugin", "goto", [fromLat, fromLng, coords.y, coords.x]);
                }
            }, function () {
                alertify.error(i18n.get("_CONSULTATION_GPS_FAIL"));
            });
        }

    };

    $scope.openLocatedReport = function (lat, lng) {
        $location.path('report/' + $rootScope.site.id + '/' + $rootScope.report_activity + '/' + lat + ',' + lng + '/');
    };

    $scope.zoomOnAsset = function (asset) {
        $rootScope.$broadcast("ZOOM_ON_ASSET", asset);

        if (Smartgeo.isRunningOnLittleScreen()) {
            $scope.close();
        }
    };

    $scope.toggleConsultationPanel = function () {
        $scope[($scope.state === 'open' ? 'close' : 'open')]();
    };

    $scope.toggleAsset = function (asset) {
        asset.open = !asset.open;
        $rootScope.$broadcast((asset.open ? "" : "UN") + "HIGHLIGHT_ASSET", asset);
    };

    $scope.close = function () {
        console.log('close');
        if ($scope.state === 'closed') {
            return;
        }
        G3ME.fullscreen();
        $scope.state = 'closed';
        if(Smartgeo.isRunningOnBigScreen()){
            for (var i = 0; $scope.assets && i < $scope.assets.length; i++) {
                if($scope.assets[i].open){
                    $scope.toggleAsset($scope.assets[i]);
                }
            }
        }

        $(".consultation-panel").first().removeClass('open').css('width', 0);
    };

    $scope.open = function () {
        console.log('open');
        if ($scope.state === 'open') {
            return;
        }
        G3ME.reduceMapWidth(Smartgeo._SIDE_MENU_WIDTH);
        if (Smartgeo.isRunningOnLittleScreen()) {
            $rootScope.$broadcast('_MENU_CLOSE_');
        }
        $scope.state = 'open';
        $(".consultation-panel").first().addClass('open').css('width', Smartgeo._SIDE_MENU_WIDTH);
    };

    $scope.definedFilter = function (value) {
        return true;
    };

    $scope.addAssetsToMission = function (asset, mission, $event) {
        if ($event) {
            $event.preventDefault();
        }
        $rootScope.addAssetToMission(asset, mission);
    };

});
