function siteUninstallController($scope, $rootScope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME) {
    $rootScope.site = $rootScope.site || JSON.parse(localStorage.sites)[$routeParams.site] ;

    var uninstallZones = function(callback){
        for (var i = 0; i < $scope.site.zones.length; i++) {
            SQLite.openDatabase({name: $scope.site.zones[i].database_name}).transaction(function(transaction){
                transaction.executeSql('DROP TABLE IF EXISTS ASSETS', [], function(){
                    i_just_save_myself("destroy_zones_databases", $scope.site.zones.length, callback);
                }, Smartgeo.log);
            });
        }
    }

    var i_just_save_myself  =  function(attribute, treeshold, callback) {
        $scope[attribute] = 1 * ($scope[attribute] || 0) + 1;
        if ($scope[attribute] >= treeshold) {
            $scope[attribute] = 0;
            return callback();
        } else {
            return false;
        }
    };

    uninstallZones(function(){
        var sites = JSON.parse(Smartgeo.get('sites'));
        delete sites[$routeParams.site];
        Smartgeo.set('sites', JSON.stringify(sites));
        $location.path('#');
        $scope.$apply();
    });

}
