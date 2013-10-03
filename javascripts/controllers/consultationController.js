function consultationController($scope, $rootScope){
    $scope.state  = 'close';

    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets){

        $scope.assets = assets;
        $scope.state  = 'open';
        $scope.$apply();

        // Ferme les onglets ouverts
        // $(".in").collapse('toggle');
        $(".collapse").collapse({
            toggle: false
        }).on('show.bs.collapse', function () {
            $rootScope.$broadcast("HIGHLIGHT_ASSET", $scope.assets[this.id.match(/collapse-(.*)/)[1]]);
        }).on('hide.bs.collapse', function () {
            $rootScope.$broadcast("UNHIGHLIGHT_ASSET", $scope.assets[this.id.match(/collapse-(.*)/)[1]]);
        });
    });

    $scope.close = function(){
        $scope.state = 'close' ;
    };

    $scope.locateAsset = function(asset){
        $rootScope.$broadcast("LOCATE_ASSET", asset);
    };

    $scope.zoomOnAsset = function(asset){
        $rootScope.$broadcast("ZOOM_ON_ASSET", asset);
    };

    $scope.toggleConsultationPanel = function(){
        $scope.state = $scope.state === 'open' ? 'close' : 'open' ;
    };

    $scope.toggleCollapse = function(event){
        event.preventDefault();
    };

    $scope.definedFilter = function(value){
        console.log(value);
        return true;
    }

}
