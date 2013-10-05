function consultationController($scope, $rootScope){
    $scope.state  = 'closed';

    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets){

        $scope.groups = {};

        for (var i = 0; i < assets.length; i++) {
            if(!$scope.groups[assets[i].okey]){
                $scope.groups[assets[i].okey] = {};
            }
            $scope.groups[assets[i].okey][assets[i].guid] = assets[i]  ;
        };

        $scope.assets = assets;
        $scope.state  = 'open';
        $scope.$apply();

        $rootScope.$broadcast("UNHIGHALLLIGHT_ASSET");

        // Ferme les onglets ouverts
        // $(".in").collapse('toggle');
        $(".collapse").collapse({
            toggle: false
        }).on('show.bs.collapse', function () {
            $rootScope.$broadcast("HIGHLIGHT_ASSET", $scope.assets[this.id.match(/collapse-.*-(.*)/)[1]]);
        }).on('hide.bs.collapse', function () {
            $rootScope.$broadcast("UNHIGHLIGHT_ASSET", $scope.assets[this.id.match(/collapse-.*-(.*)/)[1]]);
        });
    });

    $scope.close = function(){
        $scope.state = 'closed' ;
    };

    $scope.locateAsset = function(asset){
        $rootScope.$broadcast("LOCATE_ASSET", asset);
    };

    $scope.zoomOnAsset = function(asset){
        $rootScope.$broadcast("ZOOM_ON_ASSET", asset);
    };

    $scope.toggleConsultationPanel = function(){
        $scope.state = $scope.state === 'open' ? 'closed' : 'open' ;
    };

    $scope.toggleCollapse = function(event){
        event.preventDefault();
    };

    $scope.definedFilter = function(value){
        console.log(value);
        return true;
    };

}
