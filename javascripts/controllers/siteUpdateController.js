function siteUpdateController($scope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer) {

    $scope.steps = [{
        color: '#fd9122',
        progress: 0,
        target: 100
    }];
    $scope.totalProgress = 100;
    $scope.Math = Math;
    var stepsByOkey = {};
            
    function buildSteps(site) {
        var steps = [],
            step,
            n = site.number,
            stepid = 0,
            numsteps = 0,
            i;
        
        $scope.totalProgress =  1 * n.total;
        for(i in n) if(i !== 'number') {
            step = stepsByOkey[i] = {
                progress: 0,
                target: 1 * n[i],
                okey: i
            };
            steps.push(step);
        }
        rainbow(steps);
        
        $scope.steps = steps;
    }

    function rainbow(steps) {
        var phase = Math.PI * 2 / 3,
            center = 128,
            width = 127,
            frequency = Math.PI*2/steps.length,
            red, green, blue;
        for (var i = 0, lim = steps.length; i < lim; ++i) {
            red   = Math.round(Math.sin(frequency*i+2+phase) * width + center);
            green = Math.round(Math.sin(frequency*i+0+phase) * width + center);
            blue  = Math.round(Math.sin(frequency*i+4+phase) * width + center);
            steps[i].color = 'rgb('+[red, green, blue]+')';
        }
    }
    

    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site] ;

    $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.site.json')).success(function(sites){
        $scope.steps[0].progress = 50;
        
        $scope.sites = JSON.parse(Smartgeo.get('sites') || '{}') ;

        angular.extend($scope.sites, sites);

        for (var i = 0; i < sites.length; i++) {
            if(sites[i].id === $scope.siteId){
                $scope.site = sites[i];
            }
        }

        Installer.getUpdateJSON($scope.site, function(site){
            var formatedSite = Installer.formatSiteMetadata(site);
            
            $scope.steps[0].progress = 100;
            buildSteps(formatedSite);
            angular.extend($scope.site, formatedSite);
            Installer.update($scope.site, $scope.site.stats, function(){
                Installer.saveSite($scope.site);
                $location.path('/map/'+$routeParams.site);
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        });
    });
    
    $scope.$on("_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", function(event, action){
        $scope.currentInstalledOkey = action.okey;
        stepsByOkey[action.okey].progress = 1 * action.progress;
        $scope.$apply();
    });


}