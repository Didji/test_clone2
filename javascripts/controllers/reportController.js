angular.module('smartgeomobile').controller('reportController', function ($scope, $routeParams, $window, $rootScope, Smartgeo,  $location, $http, GiReportBuilder, G3ME){

    $rootScope.site = $rootScope.site || Smartgeo.get('sites')[$routeParams.site];
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

    if($routeParams.assets && !G3ME.isLatLngString($routeParams.assets)){
        $scope.fromConsult = true;
        $scope.step = "form";
        Smartgeo.findAssetsByGuids($rootScope.site, $routeParams.assets.split(','), function(assets){
            $scope.report.assets = assets;
            applyDefaultValues();
            if(!$scope.$$phase) {
                $scope.$apply();
            }
        });
    } else if ($routeParams.assets && G3ME.isLatLngString($routeParams.assets)){
        $scope.fromConsult = true;
        $scope.report.latlng = $routeParams.assets ;
        $scope.step = 'form';
    } else {
        // ERROR
    }

    $scope.loadAssets = function(){
        // TODO: optimize
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
        if(!$scope.fromConsult){
            $scope.loadAssets();
        }
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
                console.log(assets[i].asset);
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
                // Par priorité sur les valeurs par défaut, on applique les valeurs
                // fixées dans le scope par les intents.
                if($scope['report_fields['+field.label+']']) {
                    def = $scope['report_fields['+field.label+']'];
                }
                if($scope['report_fields[$'+field.id+']']) {
                    def = $scope['report_fields[$'+field.id+']'];
                }
                if(!def) {
                    continue;
                }
                if('string' === typeof def) {
                    if(field.type === 'D' && def === '#TODAY#') {
                        date = new Date();
                        def = date.getUTCFullYear()
                                + '-' + pad( date.getUTCMonth() + 1 )
                                + '-' + pad( date.getUTCDate() );
                    }
                    fields[field.id] = def;
                } else {
                    console.log(def) ;
                    def = getValueFromAssets(def.pkey, act.okeys[0]);
                    $scope.report.roFields[field.id] = $scope.formatFieldEntry(def);
                    console.log($scope.report.roFields[field.id]);
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
        $location.path('map/'+$rootScope.site.id);
    };

    $scope.sendReport = function (event) {
        $scope.sendingReport = true ;
        var report = angular.copy($scope.report);

        // TODO : faire l'équivalent d'un preventDefault  (qui ne marchera pas là)
        for (var i = 0; i < report.assets.length; i++) {
            report.assets[i] = report.assets[i].id ;
        }

        for (i = 0; i < report.ged.length; i++) {
            report.ged[i] = {
                    'content': getBase64Image(report.ged[i].content)
            };
        }

        for(i in report.overrides) {
            if(report.overrides[i]) {
                report.fields[i] = report.overrides[i];
            }
        }

        delete report.overrides;
        delete report.roFields;

        report.activity  = report.activity.id ;
        report.timestamp = new Date().getTime();
        report.mission   = 1*$rootScope.report_mission || report.mission ;

        $http.post(Smartgeo.get('url')+'gi.maintenance.mobility.report.json', report)
            .error(function(){
                Smartgeo.get_('reports', function(reports){
                    console.log(reports.length, reports);
                    reports = reports || [] ;
                    reports.push(report);
                    console.log(reports.length, reports);
                    Smartgeo.set_('reports', reports, function(){
                        // console.log('calling REPORT_LOCAL_NUMBER_CHANGE with '+reports.length, reports);
                        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", reports.length);
                        $scope.sendingReport = false ;
                        endOfReport();
                    });
                });
            }).success(function(){
                $scope.sendingReport = false ;
                endOfReport();
            });
    };

    function endOfReport(){
        if($rootScope.report_url_redirect){
            $rootScope.report_url_redirect = injectCallbackValues($rootScope.report_url_redirect) || $rootScope.report_url_redirect;
            console.log($rootScope.report_url_redirect);
            if(window.SmartgeoChromium && SmartgeoChromium.redirect){
                SmartgeoChromium.redirect(decodeURI($rootScope.report_url_redirect));
            } else {
                open($rootScope.report_url_redirect, '_blank');
            }
        }
        $location.path('map/'+$rootScope.site.id);
        if(!$scope.$$phase) {
            $scope.$apply();
        }
    }

    function injectCallbackValues(url){
        if(url.indexOf('[LABEL_INDEXED_FIELDS]') != -1){
            var injectedValues = '' ;
            for(var field in $scope.report.fields){
                if($scope.report.fields.hasOwnProperty(field)){
                    var val = $scope.report.fields[field];
                    // UGLY ALERT
                    if(typeof val === 'object' ){
                        for( var j in val){
                            val = val[j];
                            break;
                        }
                    }
                    injectedValues += 'fields['+getLabelWithFieldId(field)+']='+val+'&' ;
                }
            }
            injectedValues = injectedValues.slice(0, injectedValues.length-1);
            url = url.replace("[LABEL_INDEXED_FIELDS]", injectedValues);
            return url;
        }

        if(url.indexOf('[KEY_INDEXED_FIELDS]') != -1){
            var injectedValues = '' ;
            for(var field in $scope.report.fields){
                if($scope.report.fields.hasOwnProperty(field)){
                    injectedValues += 'fields['+field+']='+$scope.report.fields[field]+'&' ;
                }
            }
            injectedValues = injectedValues.slice(0, injectedValues.length-1);
            url = url.replace("[KEY_INDEXED_FIELDS]", injectedValues);
            return url;
        }
    }

    function getLabelWithFieldId(id){
        var activity = $scope.report.activity;  // UGLY, need to pass activity in parameters and extract this function
                                                // in something like Smartgeo.utils.getLabelWithFieldId()
        for (var i = 0; i < activity.tabs.length; i++) {
            for (var j = 0; j < activity.tabs[i].fields.length; j++) {
                if(activity.tabs[i].fields[j].id == id){
                    return activity.tabs[i].fields[j].label;
                }
            }
        }
    }

    $scope.toggleCollapse = function(event){
        event.preventDefault();
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

});
