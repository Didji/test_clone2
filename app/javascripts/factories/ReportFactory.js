angular.module('smartgeomobile').factory('Report', function ($http, Smartgeo, $q, $rootScope) {

    'use strict';

    var Report = {

        synchronizeTimeout : 60000,

        m : {
            f       : false,
            take    : function(){var t = this.f ;this.f = true; return !t;},
            release : function(){this.f = false;},
            getTime : function(){return Math.random() * (this.m_max_t - this.m_min_t) + this.m_min_t;},
            m_max_t : 5000,
            m_min_t : 1000
        },

        synchronize: function (report, callback, timeout) {

            if(typeof report === "string"){
                return Report.getByUUID(report, function(report){
                    Report.synchronize(report, callback, timeout);
                });
            }

            if(!Report.m.take()){
                return Smartgeo.sleep( Report.m.getTime(), function(){
                    Report.synchronize(report, callback, timeout);
                });
            }

            report.syncInProgress = true ;

            $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.report.json'), report, {
                timeout: timeout || Report.synchronizeTimeout
            }).success(function () {
                report.synced = true ;
                report.error  = undefined ;
            }).error(function (data, code) {
                report.error  = data && data.error && data.error.text ;
            }).finally(function(){
                Report.m.release();
                Report.log(report);
                report.syncInProgress = false ;
                Report.addToDatabase(report, callback || function(){});
            });

        },

        checkSynchronizedReports: function(){
            Report.getAll(function (reports) {

                var luuids = [];

                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].synced){
                       luuids.push(reports[i].uuid);
                    }
                }

                $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.report.check.json'),{uuids:luuids})
                    .success(function(data){
                        var ruuids = data.uuids || data ;
                        for(var uuid in ruuids){
                            if(ruuids[uuid]){
                                console.warn(uuid+ ' must be deleted');
                                Report.deleteInDatabase(uuid);
                            } else {
                                console.warn(uuid+ ' must be resync');
                                Report.synchronize(uuid);
                            }
                        }
                    })
                    .error(function(){

                    });

            });
        },

        log: function(report){
            report = angular.copy(report);
            delete report.ged ;
            if (window.SmartgeoChromium && window.SmartgeoChromium.writeJSON) {
                ChromiumCallbacks[11] = function (success) {
                    if (success) {} else {
                        console.error("writeJSONError while writing " + path);
                    }
                };
                SmartgeoChromium.writeJSON(JSON.stringify(report), 'reports/'+report.uuid+'.json');
            }
            return this;
        },

        getByUUID: function (uuid, callback) {

            if(!Report.m.take()){
                return Smartgeo.sleep( Report.m.getTime(), function(){
                    Report.getByUUID(uuid, callback);
                });
            }

            Smartgeo.get_('reports', function(reports){
                Report.m.release();
                var report;
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid !== uuid){
                        continue ;
                    } else {
                        report = reports[i] ;
                        break ;
                    }
                }
                if(!report){
                    console.error('ReportFactory->getByUUID('+uuid+') : UUID NOT FOUND IN DATABASE');
                }
                (callback || function(){})(report);
            });

        },

        getAll: function (callback) {
            if(!Report.m.take()){
                return Smartgeo.sleep( Report.m.getTime(), function(){
                    Report.getAll(callback);
                });
            }
            callback = callback || function(){};
            Smartgeo.get_('reports', function(reports){
                Report.m.release();
                callback(reports || []);
            });
        },

        addToDatabase: function (report, callback) {
            if(!Report.m.take()){
                return Smartgeo.sleep( Report.m.getTime(), function(){
                    Report.addToDatabase(report, callback);
                });
            }
            callback = callback || function(){};
            Smartgeo.get_('reports', function(reports){
                reports = reports || [] ;
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid === report.uuid){
                        Report.m.release();
                        return Report.updateInDatabase(report, callback);
                    }
                }
                reports.push(report);
                Smartgeo.set_('reports', reports, function(){
                    // $rootScope.reports = reports ;
                    Report.m.release();
                    callback(report);
                });
            });
        },

        updateInDatabase: function (report, callback) {
            if(!Report.m.take()){
                return Smartgeo.sleep( Report.m.getTime(), function(){
                    Report.updateInDatabase(report, callback);
                });
            }
            callback = callback || function(){};
            Smartgeo.get_('reports', function(reports){
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid === report.uuid){
                        reports[i] = report ;
                        return Smartgeo.set_('reports', reports, function(){
                            // $rootScope.reports = reports ;
                            Report.m.release();
                            callback(report);
                        });
                    }
                }
                Report.m.release();
                return Report.addToDatabase(report, callback);
            });
        },

        deleteInDatabase: function (report, callback) {

            if(typeof report === "string"){
                return Report.getByUUID(report, function(report){
                    Report.deleteInDatabase(report, callback);
                });
            }

            if(!Report.m.take()){
                return Smartgeo.sleep( Report.m.getTime(), function(){
                    Report.deleteInDatabase(report, callback);
                });
            }

            callback = callback || function(){};

            Smartgeo.get_('reports', function(reports){
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid === report.uuid){
                        reports.splice(i, 1);
                        return Smartgeo.set_('reports', reports, function(){
                            // $rootScope.reports = reports ;
                            Report.m.release();
                            callback();
                        });
                    }
                }
                console.error('ReportFactory->deleteInDatabase('+report.uuid+') : UUID NOT FOUND IN DATABASE');
                callback(undefined);
            });
        }

    };
    return Report;
});