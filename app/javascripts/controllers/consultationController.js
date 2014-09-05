angular.module('smartgeomobile').controller('consultationController', ["$scope", "$rootScope", "$window", "$location", "Smartgeo", "i18n", "G3ME" , "AssetFactory",  function ($scope, $rootScope, $window, $location, Smartgeo, i18n, G3ME, Asset) {

    'use strict';


    $scope.state = 'closed';
    $scope.loading = false;
    angular.element($window).bind("resize", function (e) {
        $scope.open();
        $scope.close();
    });

    var PREOPEN_TIMER;

    if(!navigator.userAgent.match(/iPhone/i) && !navigator.userAgent.match(/iPad/i)){
        $scope.$watch('loading', function () {
            var elt = $('.consultation-content')[0];
            elt.style.display = 'none';
            elt.offsetHeight = elt.offsetHeight;
            elt.style.display = 'block';
        });
    }

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

    });

    $scope.gotoAsset = function (asset) {

        var coords = asset.geometry.type === "Point" ? {
            x: asset.geometry.coordinates[0],
            y: asset.geometry.coordinates[1]
        } : {
            x: asset.geometry.coordinates[0][0],
            y: asset.geometry.coordinates[0][1]
        };

        Smartgeo.getCurrentLocation(function(lng, lat, alt, acc){
            if (window.SmartgeoChromium && window.SmartgeoChromium.goTo) {
                SmartgeoChromium.goTo(lng, lat, coords.x, coords.y);
            } else if(window.cordova){
                cordova.exec(null, function () {
                    alertify.error(i18n.get("_CONSULTATION_GPS_FAIL"));
                }, "gotoPlugin", "goto", [lat, lng, coords.y, coords.x]);
            }
        });

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

    $scope.getHistory = function(asset){
        Asset.fetchAssetsHistory(asset, function(reports){
            asset.reports = reports ;
        })
    }

    $scope.openInApp = function(url, event){
        event.preventDefault();
        if (window.SmartgeoChromium && window.SmartgeoChromium.redirect) {
             SmartgeoChromium.redirect(url);
        } else {
            window.open(url, '_system');
        }
    }


}]).filter('prettifyField', function () {

    'use strict';

    return function (s) {
        if ('string' !== typeof s) {
            return s;
        }
        return ((s + '') || '').replace(/\\n/g, '\n');
    };
}).filter('consultationTabsFilter', function () {

    'use strict';

    return function (tabsIn, asset) {
        var tabsOut = [];
        for (var i = 0; i < tabsIn.length; i++) {
            for (var j = 0; j < tabsIn[i].fields.length; j++) {
                var field = tabsIn[i].fields[j];
                if (asset.attributes[field.key]) {
                    tabsIn[i].nonBlankField = (tabsIn[i].nonBlankField || 0) + 1;
                }
            }
        }
        for (i = 0; i < tabsIn.length; i++) {
            if ((tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0)) {
                tabsOut.push(tabsIn[i]);
            }
        }
        return tabsOut;
    };
}).filter('consultationFieldsFilter', function ($rootScope) {

    'use strict';

    return function (fieldsIn, asset) {
        var fieldsOut = [];
        for (var i = 0; i < fieldsIn.length; i++) {
            if (asset.attributes[fieldsIn[i].key] ||
                (
                    fieldsIn[i].options &&
                    $rootScope.site.lists &&
                    asset.attributes[fieldsIn[i].key] &&
                    $rootScope.site.lists[fieldsIn[i].options] &&
                    $rootScope.site.lists[fieldsIn[i].options][asset.attributes[fieldsIn[i].key]]
                )
            ) {
                fieldsOut.push(fieldsIn[i]);
            }
        }
        return fieldsOut;
    };
}).filter('reportTabsFilter', function () {

    'use strict';

    return function (tabsIn, report) {
        var tabsOut = [];
        for (var i = 0; i < tabsIn.length; i++) {
            for (var j = 0; j < tabsIn[i].fields.length; j++) {
                var field = tabsIn[i].fields[j];
                if (report.fields[field.id]) {
                    tabsIn[i].nonBlankField = (tabsIn[i].nonBlankField || 0) + 1;
                }
            }
        }
        for (i = 0; i < tabsIn.length; i++) {
            if ((tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0)) {
                tabsOut.push(tabsIn[i]);
            }
        }
        return tabsOut;
    };
}).filter('reportFieldsFilter', function ($rootScope) {

    'use strict';

    return function (fieldsIn, report) {
        var fieldsOut = [];
        for (var i = 0; i < fieldsIn.length; i++) {
            if (((report.fields[fieldsIn[i].id] ||
                            (
                                fieldsIn[i].options &&
                                $rootScope.site.lists &&
                                report.fields[fieldsIn[i].id] &&
                                $rootScope.site.lists[fieldsIn[i].options] &&
                                $rootScope.site.lists[fieldsIn[i].options][report.fields[fieldsIn[i].id]] )
                            )) &&
                    JSON.stringify(report.fields[fieldsIn[i].id]) !== '{}'
            ) {
                fieldsOut.push(fieldsIn[i]);
            }
        }
        return fieldsOut;
    };
}).filter('activityListFilter', function ($rootScope) {

    'use strict';

    return function (activitiesIn, asset) {
        var activitiesOut = [];
        for (var i = 0; i < activitiesIn.length; i++) {
            if (activitiesIn[i].okeys[0] === asset.okey) {
                activitiesOut.push(activitiesIn[i]);
            }
        }
        return activitiesOut;
    };
}).filter('isGraphical', function ($rootScope) {

    'use strict';

    return function (layers) {
        var layersOut = [];
        for (var i = 0; i < layers.length; i++) {

            if(window.site.metamodel[layers[i].okey].is_graphical !== false){
                layersOut.push(layers[i]);
            }
        }
        return layersOut;
    };
}).filter('toBeSynchronized', function ($rootScope) {

    'use strict';

    return function (objects) {
        var objectsOut = [];
        for (var i = 0; i < objects.length; i++) {
            if(!objects[i].synced){
                objectsOut.push(objects[i]);
            }
        }
        return objectsOut;
    };
}).filter('synchronized', function ($rootScope) {

    'use strict';

    return function (objects) {
        var objectsOut = [];
        for (var i = 0; i < objects.length; i++) {
            if(objects[i].synced){
                objectsOut.push(objects[i]);
            }
        }
        return objectsOut;
    };
}).filter('object2Array', function ($rootScope) {

    'use strict';

    return function (objects) {
        var out = [] ;
        for(var value in objects){
            out.push({
                'value' : value,
                'label' : objects[value]
            });
        }
        return out;
    };
}).filter('isLink', function () {

    'use strict';

    return function (s) {
        return ((s + '') || '').search(/(https?:\/\/.*)$/);
    };
});
