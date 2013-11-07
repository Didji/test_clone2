angular.module('smartgeomobile').controller('consultationController', function ($scope, $rootScope, $window, $location){

    $scope.state  = 'closed';
    $scope.loading = false;

    var PREOPEN_TIMER;
    // Lorsque la carte nous informe qu'une consultation est demandée,
    // on prépare une ouverture du panneau de consultation. S'il n'y a
    // pas de résultat, on annulera cette ouverture.
    $scope.$on("CONSULTATION_CLICK_REQUESTED", function(e, coordinates) {
        $scope.coordinates = coordinates ;
        if(PREOPEN_TIMER) {
            clearTimeout(PREOPEN_TIMER);
        }
        PREOPEN_TIMER = setTimeout(function() {
            $scope.loading = true;
            $scope.state  = 'open';
            $scope.$apply();
        }, 200);
    });
    $scope.$on("CONSULTATION_CLICK_CANCELED", function() {
        if(PREOPEN_TIMER) {
            clearTimeout(PREOPEN_TIMER);
        }
        $scope.state  = 'closed';
        $scope.loading = false;
        $scope.$apply();
    });

    $scope.$on("CONSULTATION_OPEN_PANEL", function(){
        $scope.open();
        $scope.$apply();
    });

    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets){

        if(PREOPEN_TIMER) {
            clearTimeout(PREOPEN_TIMER);
        }

        $scope.groups = {};
        $scope.assets = assets;
        $scope.assets._byGuid = [];
        for (var i = 0; i < assets.length; i++) {
            if(!$scope.groups[assets[i].priority]){
                $scope.groups[assets[i].priority] = {};
            }
            if(!$scope.groups[assets[i].priority][assets[i].okey]){
                $scope.groups[assets[i].priority][assets[i].okey] = {};
            }
            $scope.assets._byGuid[assets[i].guid] = assets[i];
            $scope.groups[assets[i].priority][assets[i].okey][assets[i].guid] = assets[i]  ;
        }
        $scope.state  = 'open';
        $scope.loading = false;
        $scope.$apply();

        $rootScope.$broadcast("UNHIGHALLLIGHT_ASSET");

        $(".collapse").collapse({
            toggle: false
        }).on('show.bs.collapse', function () {
            $rootScope.$broadcast("HIGHLIGHT_ASSET", $scope.assets._byGuid[this.id.match(/collapse-(.*)/)[1]]);
        }).on('hide.bs.collapse', function () {
            $rootScope.$broadcast("UNHIGHLIGHT_ASSET", $scope.assets._byGuid[this.id.match(/collapse-(.*)/)[1]]);
        });
    });


    $scope.gotoAsset = function(asset){

        //   /!\ REFACTOR ALERT /!\
        // TODO : make polyfill class

        var coords = asset.geometry.type === "Point" ? {
            x : asset.geometry.coordinates[0],
            y : asset.geometry.coordinates[1]
        } : {
            x : asset.geometry.coordinates[0][0],
            y : asset.geometry.coordinates[0][1]
        } ;

        if(window.SmartgeoChromium && SmartgeoChromium.goTo && SmartgeoChromium.locate){

            if(!window.ChromiumCallbacks){
                window.ChromiumCallbacks = [] ;
            }

            ChromiumCallbacks[0] = function(lng, lat, alt){
                SmartgeoChromium.goTo(lng, lat, coords.x, coords.y);
            };

            ChromiumCallbacks[2] = function(){
                alertify.error("Impossible de récupérer la position GPS");
            };

            SmartgeoChromium.locate();

        } else {
            console.log('Not implemented but going from here to', [coords.x, coords.y]);
        }

    };

    $scope.openLocatedReport = function(x, y){
        $location.path('report/'+$rootScope.site.id+'/'+$rootScope.report_activity+'/'+x+','+y+'/');
    };

    $scope.close = function(){
        $scope.state = 'closed';
    };

    $scope.locateAsset = function(asset){
        $rootScope.$broadcast("LOCATE_ASSET", asset);
    };

    $scope.zoomOnAsset = function(asset){
        $rootScope.$broadcast("ZOOM_ON_ASSET", asset);
        // TODO : faire un paramètre AUTOCLOSECONSULTATIONPANEL
        if($window.document.width <= 720) {
            $scope.state = 'closed';
        }
    };

    $scope.toggleConsultationPanel = function(){
        $scope.state = $scope.state === 'open' ? 'closed' : 'open' ;
    };

    $scope.open = function(){
        $scope.state = 'open' ;
    };

    $scope.toggleCollapse = function(event){
        event.preventDefault();
    };

    $scope.definedFilter = function(value){
        console.log(value);
        return true;
    };


});
