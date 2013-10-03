function consultationController($scope, $rootScope){
    $scope.state  = 'close';
    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets){
        $scope.assets = assets;
        $scope.state  = 'open';
        $scope.$apply();

        $(".collapse").collapse({
            toggle: false
        });

    });

    $scope.close = function(){
        $scope.state = 'close' ;
    };

    $scope.locateAsset = function(asset){
        $rootScope.$broadcast("LOCATE_ASSET", asset);
    };

    $scope.toggleConsultationPanel = function(){
        $scope.state = $scope.state === 'open' ? 'close' : 'open' ;
    };

    $scope.toggleCollapse = function(event){
        // console.log($(event.currentTarget));
        event.preventDefault();
        // $(event.currentTarget).collapse('toggle');
    };

}
