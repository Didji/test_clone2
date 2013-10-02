function consultationController($scope){
    $scope.state  = 'close';

    $scope.$on("UPDATE_CONSULTATION_ASSETS_LIST", function(event, assets){
        $scope.assets = assets;
        $scope.state  = 'open';
        $scope.$apply();
    });

    $scope.close = function(){
        $scope.state = 'close' ;
    };

    // document.getElementById( 'trigger2' ).addEventListener('click', function( ev ) {
    //     ev.stopPropagation();
    //     ev.preventDefault();
    //     document.getElementById( 'mp-pusher' ).style.WebkitTransform = 'translate3d(-300px,0,0)';
    //     document.getElementById( 'mp-pusher' ).style.transform = 'translate3d(-300px,0,0)';
    // });
    // document.getElementById( 'trigger3' ).addEventListener('click', function( ev ) {
    //     ev.stopPropagation();
    //     ev.preventDefault();
    //     document.getElementById( 'mp-pusher' ).style.WebkitTransform = 'translate3d(0,0,0)';
    //     document.getElementById( 'mp-pusher' ).style.transform = 'translate3d(0,0,0)';
    // });
}
