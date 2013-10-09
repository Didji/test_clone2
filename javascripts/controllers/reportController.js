function reportController($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http, GiReportBuilder){

    $rootScope.site = $rootScope.site || JSON.parse(localStorage.sites)[$routeParams.site];
    $scope.step = "assets";
    $scope.fromConsult = false;

    GiReportBuilder.buildAllTemplates($scope.site.activities);

    $scope.report = {
        assets: [],
        fields: {},
        roFields: {},
        overrides: {},
        ged:[],
        activity: null,
        uuid : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            })
    };

    if($routeParams.assets){
        $scope.fromConsult = true;
        $scope.step = "form";
        Smartgeo.findAssetsByGuids($rootScope.site, $routeParams.assets.split(','), function(assets){
            $scope.report.assets = assets;
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
        $scope.reportTemplate = 'report-'+$routeParams.activity+'.html';
        for (var i = 0; i < $rootScope.site.activities.length; i++) {
            if($rootScope.site.activities[i].id == $routeParams.activity) {
                $scope.report.activity = $rootScope.site.activities[i];
                var act = $scope.report.activity;
                // We have to flag fields which have visibility consequences
                // to enable a correct layout.
                for(var j = 0, numTabs = act.tabs.length; j < numTabs; j++) {
                    tab = act.tabs[j];
                    for(var k = 0, numFields = tab.fields.length; k < numFields; k++) {
                        tab.fields[k].isconsequence = (tab.fields[k].visible === false);
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

        function getList(pkey, okey) {
            var mm = $rootScope.site.metamodel[okey];
            for(var i in mm.tabs) {
                for(var j in mm.tabs[i].fields) {
                    if(mm.tabs[i].fields[j].key == pkey) {
                        return mm.tabs[i].fields[j].options;
                    }
                }
            }
            return false;
        }
        
        function getValueFromAssets(pkey, okey) {
            var rv = {}, val;
            for(var i = 0, lim = assets.length; i < lim; i++) {
                var a = JSON.parse(assets[i].asset).attributes,
                    list = getList(pkey, okey);
                
                val = a[pkey];
                if(list && $rootScope.site.lists[list] && $rootScope.site.lists[list][val]) {
                    val = $rootScope.site.lists[list][val];
                }
                
                rv[assets[i].id] = val;
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
                    def = getValueFromAssets(def.pkey, act.okeys[0]);
                    $scope.report.roFields[field.id] = $scope.formatFieldEntry(def);
                    $scope.report.overrides[field.id] = '';
                    fields[field.id] = def;
                }
            }
        }
    }

    $scope.formatFieldEntry = function(val) {
        if('string' === typeof val) {
            return val;
        }
        var str = [];
        for(var a in val) {
            if(val[a]) {
                str.push(val[a]);
            }
        }
        return str.join(', ');
    };
    
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
        $scope.sendingReport = true ;
        // TODO : faire l'équivalent d'un preventDefault  (qui ne marchera pas là)
        for (var i = 0; i < $scope.report.assets.length; i++) {
            $scope.report.assets[i] = $scope.report.assets[i].id ;
        }

        for (i = 0; i < $scope.report.ged.length; i++) {
            $scope.report.ged[i] = {
                    'content': getBase64Image($scope.report.ged[i].content)
            };
        }

        for(i in $scope.report.overrides) {
            if($scope.report.overrides[i]) {
                $scope.report.fields[i] = $scope.report.overrides[i];
            }
        }
        
        delete $scope.report.overrides;
        delete $scope.report.roFields;
        
        $scope.report.activity  = $scope.report.activity.id ;
        $scope.report.timestamp = new Date().getTime();

        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', $scope.report)
            .error(function(){
                var reports = JSON.parse( Smartgeo.get('reports') || '[]');
                reports.push($scope.report);
                Smartgeo.set('reports', JSON.stringify(reports));
            }).then(function(){
                $scope.sendingReport = false ;
                $location.path('map/'+$rootScope.site.id);
            });
    };

    $scope.toggleCollapse = function(event){
        event.preventDefault();
    };

    $scope.addPicture = function(){

        if (!navigator.camera || !Camera){
            $scope.report.ged.push({
                content:'http://placehold.it/350x150'
            });
            return ;
        }

        navigator.camera.getPicture(function(ImageData) {
            $scope.report.ged.push({
                content:ImageData
            });
            $scope.$apply();
        }, function(CameraError) {
            console.error(CameraError);
        }, {
            quality: 100,
            sourceType: navigator.camera.PictureSourceType.CAMERA,
            mediaType: navigator.camera.MediaType.PICTURE,
            destinationType: Camera.DestinationType.FILE_URI,
            correctOrientation: false,
            saveToPhotoAlbum: true
        });

    };

    getBase64Image = function(src) {
        var img = document.createElement("img");
        img.src = src ;
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        return dataURL ;
        // return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
    };

}
