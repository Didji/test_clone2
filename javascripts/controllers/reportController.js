function reportController($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http){

    $scope.site = JSON.parse(localStorage.sites)[$routeParams.site];
    $scope.step = "assets";
    
    $scope.report = {
        assets: [],
        fields: {},
        activity: null
    };

    if($routeParams.assets){
        Smartgeo.findAssetsByGuids($scope.site, $routeParams.assets.split(','), function(assets){
            $scope.report.assets = assets;
            $scope.step = "form";
            applyDefaultValues();
            $scope.$apply();
        });
    }

    $scope.loadAssets = function(){
        Smartgeo.findAssetsByOkey($scope.site, $scope.report.activity.okeys[0], function(assets){
            $scope.assets = assets ;
            $scope.$apply();
        });
    };

    if($routeParams.activity){
        for (var i = 0; i < $scope.site.activities.length; i++) {
            if($scope.site.activities[i].id == $routeParams.activity) {
                $scope.report.activity = $scope.site.activities[i];
                break;
            }
        }
        $scope.loadAssets();
    }

    
    function applyDefaultValues() {
        var report = $scope.report,
            act = report.activity,
            fields = report.fields,
            assets = report.assets,
            tid, fid, def,
            i, numTabs, j, numFields,
            tab, field,
            date;
        function pad(number) {
            if ( number < 10 ) {
                return '0' + number;
            }
            return number;
        }
        
        function getValueFromAssets(pkey) {
            var rv = [];
            for(var i = 0, lim = assets.length; i < lim; i++) {
                var a = JSON.parse(assets[0].asset).attributes;
                rv.push(a[pkey]);
            }
            return rv;
        }
        
        for(i = 0, numTabs = act.tabs.length; i < numTabs; i++) {
            tab = act.tabs[i];
            for(j = 0, numFields = tab.fields.length; j < numFields; j++) {
                field = tab.fields[j];
                def = field['default'];
                
                if(!def) {
                    continue;
                }
                if('string' === typeof def) {
                    if(field.type === 'D' && def === '#TODAY#') {
                        date = new Date;
                        def = date.getUTCFullYear() 
                                + '-' + pad( date.getUTCMonth() + 1 )
                                + '-' + pad( date.getUTCDate() )
                    }
                    fields[field.id] = def;
                } else {
                    fields[field.id] = getValueFromAssets(def.pkey);
                }
            }
        }
    }
    
    
    
    $scope.toForm = function() {
        $scope.step = 'form';
        applyDefaultValues();
    };
    
    $scope.cancel = function() {
        $window.history.back();
    }
    
    $scope.sendReport = function (event) {
        // TODO : faire l'équivalent d'un preventDefault  (qui ne marchera pas là)
        for (var i = 0; i < $scope.report.assets.length; i++) {
            $scope.report.assets[i] = $scope.report.assets[i].id ;
        }

        // TODO : remplacer par de la verification de formulaire
        if(!$scope.report.fields.length){
            return window.alert("Aucun champs n'a été renseigné");
        }

        $scope.report.activity = $scope.report.activity.id ;

        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.report)
            .success(function(){
                $location.path('map/'+$scope.site.id);
            })
            .error(function(){
                $location.path('map/'+$scope.site.id);
                console.log(arguments);
            });
    };
    
    $scope.toggleCollapse = function(event){
        event.preventDefault();
    };

}
