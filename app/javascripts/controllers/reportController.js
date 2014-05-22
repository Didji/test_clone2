angular.module('smartgeomobile').controller('reportController', function($scope, $routeParams, $window, $rootScope, Smartgeo, $location, $http, G3ME, i18n, Report) {

    'use strict';

    $scope.isAndroid = navigator.userAgent.match(/Android/i);

    $scope.comesFromIntent = $rootScope.map_activity || $rootScope.report_activity;
    $rootScope.site = $rootScope.site || Smartgeo.get_('sites')[$routeParams.site];
    $scope.step = "assets";
    $scope.fromConsult = false;
    // GiReportBuilder.buildAllTemplates($scope.site.activities);

    $scope._MAX_MEDIA_PER_REPORT = Smartgeo._MAX_MEDIA_PER_REPORT;
    $scope.activities = angular.copy($rootScope.site.activities);
    $scope.report = Report.new();
    $scope.report.mission = 1 * $routeParams.mission;
    if (!$routeParams.activity && $routeParams.assets) {
        $scope.report.isCall = true;
    } else {
        $scope.report.isCall = false;
    }

    if (!$rootScope.site.activities._byId) {
        $rootScope.site.activities._byId = {};
        for (var i = 0; i < $rootScope.site.activities.length; i++) {
            $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
        }
    }

    if ($routeParams.activity && $routeParams.assets && !G3ME.isLatLngString($routeParams.assets)) {
        $scope.fromConsult = true;
        $scope.step = "form";
        $scope.report.activity = angular.copy($rootScope.site.activities._byId[$routeParams.activity]);
        $scope.report.activity.tabs[0].show = true;
        Smartgeo.findAssetsByGuids($rootScope.site, $routeParams.assets.split(','), function(assets) {
            $scope.report.assets = assets;
            applyDefaultValues();
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    } else if ($routeParams.activity && $routeParams.assets && G3ME.isLatLngString($routeParams.assets)) {
        $scope.report.activity = angular.copy($rootScope.site.activities._byId[$routeParams.activity]);
        $scope.report.activity.tabs[0].show = true;
        $scope.fromConsult = true;
        $scope.report.latlng = $routeParams.assets;
        $scope.step = 'form';
    } else if ($routeParams.activity && !$routeParams.assets) {
        $scope.report.activity = angular.copy($rootScope.site.activities._byId[$routeParams.activity]);
        $scope.report.activity.tabs[0].show = true;
    } else if ($routeParams.assets && !G3ME.isLatLngString($routeParams.assets)) {
        Smartgeo.findAssetsByGuids($rootScope.site, $routeParams.assets.split(','), function(assets) {
            var filteredActivities = [],
                okey = assets[0].okey;
            for (var i = 0; i < $scope.activities.length; i++) {
                if (okey === $scope.activities[i].okeys[0]) {
                    filteredActivities.push($scope.activities[i]);
                }
            }
            $scope.activities = filteredActivities;
            $scope.report.assets = assets;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    }

    $scope.activityListChangeHandler = function() {
        if (!$scope.report.assets.length) {
            $scope.loadAssets();
        } else {
            $scope.toForm();
        }
    };

    $scope.applyVisibility = function() {
        $scope.reportTemplate = 'report-' + $scope.report.activity.id + '.html';
        for (var i = 0; i < $rootScope.site.activities.length; i++) {
            if ($rootScope.site.activities[i].id === $scope.report.activity.id) {
                $scope.report.activity = angular.copy($rootScope.site.activities[i]);
                $scope.report.activity.tabs[0].show = true;
                var act = $scope.report.activity;
                // We have to flag fields which have visibility consequences
                // to enable a correct layout.
                for (var j = 0, numTabs = act.tabs.length, tab; j < numTabs; j++) {
                    tab = act.tabs[j];
                    for (var k = 0, numFields = tab.fields.length; k < numFields; k++) {
                        tab.fields[k].isconsequence = (tab.fields[k].visible === false);
                    }
                }
                break;
            }
        }
    };

    $scope.bidouille = function(event) {
        document.querySelector('#mainview').firstChild.scrollTop = $(event.currentTarget).closest('label')[0].offsetTop - 7;
        if (window.screen.height <= 640) {
            document.querySelector('.reportForm').style.paddingBottom = "280px";
        }
    };

    $scope.loadAssets = function() {
        Smartgeo.findAssetsByOkey($rootScope.site, $scope.report.activity.okeys[0], function(assets) {
            $scope.assets = assets;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };

    if ($scope.report.activity) {
        $scope.applyVisibility();
        if (!$scope.fromConsult) {
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

        for (i = 0, numTabs = act.tabs.length; i < numTabs; i++) {
            tab = act.tabs[i];
            for (j = 0, numFields = tab.fields.length; j < numFields; j++) {
                if (tab.fields[j].id == id) {
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
            if (number < 10) {
                return '0' + number;
            }
            return number;
        }

        function getList(pkey, okey) {
            var mm = $rootScope.site.metamodel[okey];
            for (var i in mm.tabs) {
                for (var j in mm.tabs[i].fields) {
                    if (mm.tabs[i].fields[j].key === pkey) {
                        return mm.tabs[i].fields[j].options;
                    }
                }
            }
            return false;
        }

        function getValueFromAssets(pkey, okey) {
            var rv = {}, val;
            for (var i = 0, lim = assets.length; i < lim; i++) {
                var a = JSON.parse(assets[i].asset).attributes,
                    list = getList(pkey, okey);

                val = a[pkey];
                if (list && $rootScope.site.lists[list] && $rootScope.site.lists[list][val]) {
                    val = $rootScope.site.lists[list][val];
                }

                rv[assets[i].id] = val;
            }
            return rv;
        }

        for (i = 0, numTabs = act.tabs.length; i < numTabs; i++) {
            tab = act.tabs[i];
            for (j = 0, numFields = tab.fields.length; j < numFields; j++) {
                field = tab.fields[j];
                def = field['default'];
                // Par priorité sur les valeurs par défaut, on applique les valeurs
                // fixées dans le scope par les intents.
                if ($scope['report_fields[' + field.label + ']']) {
                    def = $scope['report_fields[' + field.label + ']'];
                }
                if ($scope['report_fields[$' + field.id + ']']) {
                    def = $scope['report_fields[$' + field.id + ']'];
                }
                if (!def) {
                    continue;
                }
                if ('string' === typeof def) {
                    if (field.type === 'D' && def === '#TODAY#') {
                        date = new Date();
                        def = date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
                    }
                    fields[field.id] = def;
                    $scope.report.roFields[field.id] = def;
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
        if ('string' === typeof val) {
            return val;
        }
        var str = [];
        for (var a in val) {
            if (val[a]) {
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

        if (!field.actions) {
            return false;
        }

        for (i = 0, lim = field.actions.length; i < lim; i++) {
            act = field.actions[i];
            targetField = fieldById(act.target);
            if (!targetField) {
                continue;
            }

            cond = ($scope.report.fields[srcId] === act.condition);
            switch (act.type) {
                case "show":
                    targetField.visible = cond;

                    // Si targetField est une case à cocher, elle a peut-être
                    // aussi des conséquences. Si une case à cocher devient invisible,
                    // il faut qu'on la décoche et qu'on applique ses conséquences.
                    if (cond === false && targetField.type === 'O') {
                        $scope.report.fields[act.target] = 'N';
                        $scope.applyConsequences(act.target);
                    }

                    break;
                case "require":
                    targetField.required = cond;
                    break;
            }
        }
    };

    $scope.toForm = function() {
        $scope.step = 'form';
        $scope.applyVisibility();
        applyDefaultValues();
    };

    $scope.cancel = function() {
        $location.path('map/' + $rootScope.site.id);
    };

    $scope.sendReport = function(event) {
        $scope.sendingReport = true;
        var report = angular.copy($scope.report);
        for (var i = 0; i < report.assets.length; i++) {
            if (report.assets[i].id) {
                report.assets[i] = report.assets[i].id;
            }
        }

        for (i in report.fields) {
            if (typeof report.fields[i] === "object" && report.fields[i].id && report.fields[i].text) {
                report.fields[i] = report.fields[i].id;
            }
        }

        for (i = 0; i < report.ged.length; i++) {
            report.ged[i] = {
                'content': getBase64Image(report.ged[i].content)
            };
        }

        for (i in report.overrides) {
            if (report.overrides[i]) {
                report.fields[i] = report.overrides[i];
            }
        }

        delete report.overrides;
        delete report.roFields;

        report.activity = report.activity.id;
        report.timestamp = new Date().getTime();
        report.mission = 1 * $rootScope.report_mission || report.mission;

        Report.save(report).then(null, null, function() {
            $scope.sendingReport = false;
            if (!$scope.comesFromIntent) {
                endOfReport();
            }
        });

        if ($scope.comesFromIntent) {
            endOfReport();
        }
    };

    function endOfReport() {

        if ($rootScope.report_url_redirect) {
            $rootScope.report_url_redirect = injectCallbackValues($rootScope.report_url_redirect) || $rootScope.report_url_redirect;
            if (window.SmartgeoChromium && SmartgeoChromium.redirect) {
                SmartgeoChromium.redirect(decodeURI($rootScope.report_url_redirect));
            } else {
                window.open($rootScope.report_url_redirect, "_blank");
            }
        }

        // TODO: Put all intents variables in something like $rootScope.intent.[map|report]_*
        //       It will be easier to reset context ($rootScope.intent=undefined)
        $rootScope.map_target = undefined;
        $rootScope.map_marker = undefined;
        $rootScope.map_activity = undefined;
        $rootScope.report_activity = undefined;
        $rootScope.report_mission = undefined;
        $rootScope.report_target = undefined;
        $rootScope.report_fields = undefined;
        $rootScope.report_url_redirect = undefined;

        $location.path('map/' + $rootScope.site.id);
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }

    function injectCallbackValues(url) {
        var injectedValues;
        if (url.indexOf('[LABEL_INDEXED_FIELDS]') !== -1) {
            injectedValues = '';
            for (var field in $scope.report.fields) {
                if ($scope.report.fields.hasOwnProperty(field)) {
                    var val = $scope.report.fields[field];
                    // /!\ UGLY ALERT WORKS WITH ONLY ONE ASSETS
                    if (typeof val === 'object') {
                        for (var j in val) {
                            val = val[j];
                            break;
                        }
                    }
                    injectedValues += 'fields[' + getLabelWithFieldId(field) + ']=' + val + '&';
                }
            }
            injectedValues = injectedValues.slice(0, injectedValues.length - 1);
            url = url.replace("[LABEL_INDEXED_FIELDS]", injectedValues);
            return url;
        } else if (url.indexOf('[KEY_INDEXED_FIELDS]') !== -1) {
            injectedValues = '';
            for (var field_ in $scope.report.fields) {
                if ($scope.report.fields.hasOwnProperty(field_)) {
                    injectedValues += 'fields[' + field_ + ']=' + $scope.report.fields[field_] + '&';
                }
            }
            injectedValues = injectedValues.slice(0, injectedValues.length - 1);
            url = url.replace("[KEY_INDEXED_FIELDS]", injectedValues);
            return url;
        } else {
            return url;
        }
    }

    function getLabelWithFieldId(id) {
        var activity = $scope.report.activity; // UGLY, need to pass activity in parameters and extract this function
        // in something like Smartgeo.utils.getLabelWithFieldId()
        for (var i = 0; i < activity.tabs.length; i++) {
            for (var j = 0; j < activity.tabs[i].fields.length; j++) {
                if (activity.tabs[i].fields[j].id == id) {
                    return activity.tabs[i].fields[j].label;
                }
            }
        }
    }

    $scope.containsRequiredFields = function(tab) {
        for (var i in tab.fields) {
            if (tab.fields[i].required) {
                return true;
            }
        }
        return false;
    };

    $scope.areEveryRequiredFieldsAreFilled = function() {
        if (!$scope.report.activity) {
            return;
        }
        for (var i in $scope.report.activity.tabs) {
            var tab = $scope.report.activity.tabs[i];
            for (var j in tab.fields) {
                var field = tab.fields[j];
                if (field.required && !$scope.report.fields[field.id]) {
                    return false;
                }
            }
        }
        return true;
    };

    $scope.toggleCollapse = function(event) {
        event.preventDefault();
    };

    $scope.removeGed = function($index) {
        $scope.report.ged.splice($index, 1);
    };

    function getBase64Image(src) {
        var img = document.createElement("img");
        img.src = src;
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        return dataURL;
    }

    var fetchGroups = function(queryParams) {
        return $http.post("http://backend.com/search/", queryParams.data).then(queryParams.success);
    };

    $scope.groupSelectOptions = {
        minimumInputLength: 2,
        query: function (query) {
            for (var j = 0; j < $rootScope.site.activities._byId[$scope.report.activity.id].tabs.length; j++) {
                if(query.element.data('tabid') === $rootScope.site.activities._byId[$scope.report.activity.id].tabs[j].id){
                    var tab = $rootScope.site.activities._byId[$scope.report.activity.id].tabs[j] ;
                    for (var i = 0; i < tab.fields.length; i++) {
                        if(tab.fields[i].id === query.element.data('field')){
                            var field = tab.fields[i], data = {results: []};
                            for(var k=0; k< field.options.length; k++){
                                if( field.options[k].label.toLowerCase().indexOf(query.term.toLowerCase()) !== -1 ){
                                    data.results.push({id: field.options[k].value , text: field.options[k].label});
                                }
                            }
                            data.results.sort(function(a, b){
                                if(a.text < b.text){
                                    return -1;
                                } else if(a.text > b.text) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            });
                            return query.callback(data);
                        }
                    }
                }
            }
        }
    };

});
