angular.module('smartgeomobile').factory('ReportSynchronizer', function ($http, Smartgeo, $q, $rootScope) {

    'use strict';

    var ReportSynchronizer = {

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
                return ReportSynchronizer.getByUUID(report, function(report){
                    ReportSynchronizer.synchronize(report, callback, timeout);
                });
            }

            if(!ReportSynchronizer.m.take()){
                return Smartgeo.sleep( ReportSynchronizer.m.getTime(), function(){
                    ReportSynchronizer.synchronize(report, callback, timeout);
                });
            }

            report.syncInProgress = true ;

            $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.report.json'), report, {
                timeout: timeout || ReportSynchronizer.synchronizeTimeout
            }).success(function (data) {
                if(!data.cri || !data.cri.length){
                    ReportSynchronizer.synchronizeErrorCallback(data, false, report);
                } else {
                    report.synced = true ;
                    report.error  = undefined ;
                }
            }).error(function (data, code) {
                ReportSynchronizer.synchronizeErrorCallback(data, code, report);
            }).finally(function(){
                ReportSynchronizer.m.release();
                ReportSynchronizer.log(report);
                report.syncInProgress = false ;
                ReportSynchronizer.addToDatabase(report, callback || function(){});
            });

        },

        synchronizeErrorCallback: function(data, code, report){
            if(code){
                report.error  = (data && data.error && data.error.text) || "Erreur inconnue lors de la synchronisation de l'objet.";
            } else {
                report.error  = "Erreur réseau.";
            }
        },

        checkSynchronizedReports: function(){
            ReportSynchronizer.getAll(function (reports) {

                var luuids = [];

                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].synced){
                       luuids.push(reports[i].uuid);
                    }
                }

                $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.report.check.json'),{uuids:luuids})
                    .success(function(data){
                        if((typeof data) === "string"){
                            return ; // Compatibilité GIMAO666
                        }
                        var ruuids = data.uuids || data ;
                        for(var uuid in ruuids){
                            if(ruuids[uuid]){
                                console.warn(uuid+ ' must be deleted');
                                ReportSynchronizer.deleteInDatabase(uuid);
                            } else {
                                console.warn(uuid+ ' must be resync');
                                ReportSynchronizer.synchronize(uuid);
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

            if(!ReportSynchronizer.m.take()){
                return Smartgeo.sleep( ReportSynchronizer.m.getTime(), function(){
                    ReportSynchronizer.getByUUID(uuid, callback);
                });
            }

            Smartgeo.get_('reports', function(reports){
                reports = reports || [];
                ReportSynchronizer.m.release();
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
            if(!ReportSynchronizer.m.take()){
                return Smartgeo.sleep( ReportSynchronizer.m.getTime(), function(){
                    ReportSynchronizer.getAll(callback);
                });
            }
            callback = callback || function(){};
            Smartgeo.get_('reports', function(reports){
                ReportSynchronizer.m.release();
                callback(reports || []);
            });
        },

        addToDatabase: function (report, callback) {
            if(!ReportSynchronizer.m.take()){
                return Smartgeo.sleep( ReportSynchronizer.m.getTime(), function(){
                    ReportSynchronizer.addToDatabase(report, callback);
                });
            }
            callback = callback || function(){};
            Smartgeo.get_('reports', function(reports){
                reports = reports || [] ;
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid === report.uuid){
                        ReportSynchronizer.m.release();
                        return ReportSynchronizer.updateInDatabase(report, callback);
                    }
                }
                reports.push(report);
                Smartgeo.set_('reports', reports, function(){
                    // $rootScope.reports = reports ;
                    ReportSynchronizer.m.release();
                    callback(report);
                });
            });
        },

        updateInDatabase: function (report, callback) {
            if(!ReportSynchronizer.m.take()){
                return Smartgeo.sleep( ReportSynchronizer.m.getTime(), function(){
                    ReportSynchronizer.updateInDatabase(report, callback);
                });
            }
            callback = callback || function(){};
            Smartgeo.get_('reports', function(reports){
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid === report.uuid){
                        reports[i] = report ;
                        return Smartgeo.set_('reports', reports, function(){
                            // $rootScope.reports = reports ;
                            ReportSynchronizer.m.release();
                            callback(report);
                        });
                    }
                }
                ReportSynchronizer.m.release();
                return ReportSynchronizer.addToDatabase(report, callback);
            });
        },

        deleteInDatabase: function (report, callback) {

            if(!report){
                return ;
            }

            if(typeof report === "string"){
                return ReportSynchronizer.getByUUID(report, function(report){
                    ReportSynchronizer.deleteInDatabase(report, callback);
                });
            }

            if(!ReportSynchronizer.m.take()){
                return Smartgeo.sleep( ReportSynchronizer.m.getTime(), function(){
                    ReportSynchronizer.deleteInDatabase(report, callback);
                });
            }

            callback = callback || function(){};

            Smartgeo.get_('reports', function(reports){
                for (var i = 0; i < reports.length; i++) {
                    if(reports[i].uuid === report.uuid){
                        reports.splice(i, 1);
                        return Smartgeo.set_('reports', reports, function(){
                            // $rootScope.reports = reports ;
                            ReportSynchronizer.m.release();
                            callback();
                        });
                    }
                }
                console.error('ReportFactory->deleteInDatabase('+report.uuid+') : UUID NOT FOUND IN DATABASE');
                callback(undefined);
            });
        }

    };
    return ReportSynchronizer;
});