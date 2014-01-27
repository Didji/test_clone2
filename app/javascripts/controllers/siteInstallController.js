angular.module('smartgeomobile').controller('siteInstallController', function ($scope, $routeParams, $http, Smartgeo, SQLite, $location, G3ME, Installer, i18n) {

    'use strict' ;

    $scope.steps = [{
        color: '#fd9122',
        progress: 0,
        target: 100
    }];
    $scope.totalProgress = 100;
    $scope.sites = Smartgeo.get_('sites') || {} ;
    $scope.Math = Math;
    /* Si le site est déjà installé, on ne le reinstalle pas (#132), on retourne sur la carte */
    if($scope.sites[$routeParams.site] && $scope.sites[$routeParams.site].installed === true){
        $location.path('/map/'+$routeParams.site);
    }

    var stepsByOkey = {};

    $scope.$on('$locationChangeStart', function (event, next, current) {
        if(next.indexOf('/map/') === -1) {
            event.preventDefault();
        }
    });

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

    var url = Smartgeo.getServiceUrl('gi.maintenance.mobility.site.json');

    $http.get(url).success(function(sites){

        for(var i in sites){
            if(!$scope.sites[sites[i].id]){
                $scope.sites[sites[i].id] = sites[i] ;
            }
            if(sites[i].id === $routeParams.site){
                $scope.site = sites[i];
            }
        }

        $scope.steps[0].progress = 50;

        Installer.getInstallJSON($scope.site, function(site){
            $scope.steps[0].progress = 100;

            var formatedSite = Installer.formatSiteMetadata(site);
            buildSteps(formatedSite);
            angular.extend($scope.site, formatedSite);
            Installer.createZones($scope.site, function(){
                Installer.install($scope.site, $scope.site.stats, function(){
                    $scope.site.installed = true ;
                    Installer.saveSite($scope.site);
                    $location.path('/map/'+$routeParams.site);
                    if(!$scope.$$phase) {
                        $scope.$apply();
                    }
                });
            });
        });
    });

    $scope.$on("_INSTALLER_I_AM_CURRENTLY_DOING_THIS_", function(event, action){
        $scope.currentInstalledOkey = action.okey;
        stepsByOkey[action.okey].progress = 1 * action.progress;
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    });


});