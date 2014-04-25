angular.module('smartgeomobile').factory('Report', function ($http, Smartgeo, $q, $rootScope) {

    'use strict';

    var Report = {
        save: function (report) {

            if(!report.site){
                report.site = $rootScope.site.label;
            }

            var deferred = $q.defer();
            $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.report.json'), report, {
                timeout: 5000
            })
                .success(function (data) {
                    if (window.SmartgeoChromium && window.SmartgeoChromium.log) {
                        window.SmartgeoChromium.log(Report.getLog(report, true));
                    }
                    Smartgeo.get_('reports', function (reports) {
                        reports = reports || [];
                        report.synced = true;
                        reports.push(report);
                        Smartgeo.set_('reports', reports, function () {
                            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                        });
                    });
                    deferred.notify();
                    deferred.resolve();
                })
                .error(function () {
                    if (window.SmartgeoChromium && window.SmartgeoChromium.log) {
                        window.SmartgeoChromium.log(Report.getLog(report, false));
                    }
                    Smartgeo.get_('reports', function (reports) {
                        reports = reports || [];
                        reports.push(report);
                        Smartgeo.set_('reports', reports, function () {
                            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                        });
                    });
                    deferred.notify();
                    deferred.resolve();
                });
            return deferred.promise;
        },
        getLog: function (report, success) {
            var now = new Date(),
                day = now.getDate(),
                month = now.getMonth() + 1,
                year = now.getYear() + 1900,
                hour = now.getHours(),
                minute = now.getMinutes(),
                formattedDate = (day < 10 ? '0' : '') + day + '/' + (month < 10 ? '0' : '') + month + '/' + year,
                formattedHour = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute,
                log = formattedDate + ';' + formattedHour + ';' + (success ? 'transféré' : 'à synchroniser') + ';' + report.activity + ';' + report.uuid;
            return log;
        },
        new: function () {
            return {
                assets: [],
                fields: {},
                roFields: {},
                overrides: {},
                ged: [],
                mission: null,
                activity: null,
                uuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0,
                        v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                })
            };
        }
    };
    return Report;
});
