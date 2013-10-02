function consultationController($scope){
    $scope.state  = 'close';
    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets){
        $scope.assets = assets;
        $scope.state  = 'open';
        $scope.$apply();
    });
}


