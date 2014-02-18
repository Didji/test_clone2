angular.module('smartgeomobile').directive("census", ['$compile', "ComplexAssetFactory" ,function ($compile, ComplexAssetFactory, $rootScope) {
    return {

        restrict: 'E',

        replace: true,

        scope: {
            'okey': '='
        },

        templateUrl: 'partials/censusDirectiveTemplate.html',

        compile: function (el) {

            var contents = el.contents().remove();

            return function($scope,el){

                $compile(contents)($scope,function(clone){
                    el.append(clone);
                });

                $scope.site = window.site ;
                $scope.root = new ComplexAssetFactory($scope.okey);
                $scope.node = $scope.root;
                window.root = $scope.root;
                $scope.toggleCollapse = function (event, tab) {
                    event.preventDefault();
                    tab.visible = !!!tab.visible;
                };
            };

        }

    };

}]);
