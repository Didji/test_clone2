function reportController($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http){

    $rootScope.site = $rootScope.site || JSON.parse(localStorage.sites)[$routeParams.site];
    $scope.step = "assets";

    $scope.report = {
        assets: [],
        fields: {},
        activity: null
    };

    if($routeParams.assets){
        Smartgeo.findAssetsByGuids($rootScope.site, $routeParams.assets.split(','), function(assets){
            $scope.report.assets = assets;
            $scope.step = "form";
            applyDefaultValues();
            if(!$scope.$$phase) {
                $scope.$apply();
            }
        });
    }

    $scope.loadAssets = function(){
        Smartgeo.findAssetsByOkey($rootScope.site, $scope.report.activity.okeys[0], function(assets){
            $scope.assets = assets ;
            if(!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };

    if($routeParams.activity){
        for (var i = 0; i < $rootScope.site.activities.length; i++) {
            if($rootScope.site.activities[i].id == $routeParams.activity) {
                $scope.report.activity = $rootScope.site.activities[i];
                var act = $scope.report.activity;
                // We have to flag fields which have visibility consequences
                // to enable a correct layout.
                for(var i = 0, numTabs = act.tabs.length; i < numTabs; i++) {
                    tab = act.tabs[i];
                    for(var j = 0, numFields = tab.fields.length; j < numFields; j++) {
                        tab.fields[j].isconsequence = (tab.fields[j].visible === false);
                    }
                }

                break;
            }
        }
        $scope.loadAssets();
    }

    // Used for field validation
    $scope.numberPattern = /^(\d+([.]\d*)?|[.]\d+)$/;

    function fieldById(id) {
        var report = $scope.report,
            act = report.activity,
            i, numTabs, j, numFields,
            tab;

        for(i = 0, numTabs = act.tabs.length; i < numTabs; i++) {
            tab = act.tabs[i];
            for(j = 0, numFields = tab.fields.length; j < numFields; j++) {
                if(tab.fields[j].id == id) {
                    return tab.fields[j];
                }
            }
        }
        return false;
    }

    function applyDefaultValues() {
        var report = $scope.report,
            act = report.activity,
            fields = report.fields,
            assets = report.assets,
            def,
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
                    def = getValueFromAssets(def.pkey);
                    if(field.readonly) {
                        def = def.join(', ');
                    }
                    fields[field.id] = def;
                }
            }
        }
    }

    $scope.applyConsequences = function(srcId) {
        // Search for src field.
        var field = fieldById(srcId),
            targetField, i, lim, act,
            cond;

        if(!field.actions) {
            return false;
        }

        for(i = 0, lim = field.actions.length; i < lim; i++) {
            act = field.actions[i];
            targetField = fieldById(act.target);
            if(!targetField) {
                continue;
            }

            cond = ($scope.report.fields[srcId] == act.condition);
            switch(act.type) {
                case "show":
                    targetField.visible = cond;
                    break;
                case "require":
                    targetField.required = cond;
                    break;
            }
        }
    };

    $scope.toForm = function() {
        $scope.step = 'form';
        applyDefaultValues();
    };

    $scope.cancel = function() {
        $window.history.back();
    };

    $scope.sendReport = function (event) {
        // TODO : faire l'équivalent d'un preventDefault  (qui ne marchera pas là)
        for (var i = 0; i < $scope.report.assets.length; i++) {
            $scope.report.assets[i] = $scope.report.assets[i].id ;
        }

        $scope.report.activity = $scope.report.activity.id ;

        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.report)
            .success(function(){
                $location.path('map/'+$rootScope.site.id);
            })
            .error(function(){
                $location.path('map/'+$rootScope.site.id);
                console.log(arguments);
            });
    };

    $scope.toggleCollapse = function(event){
        event.preventDefault();
    };

}
