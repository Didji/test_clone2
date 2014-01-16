angular.module('smartgeomobile').factory('Report', function($http, Smartgeo, $q){

    'use strict';

    var Report = {
        save : function(report){
            var deferred = $q.defer();
            $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.report.json'), report, {timeout: 5000})
                .success(function(){
                    deferred.notify ();
                    deferred.resolve();
                })
                .error(function(){
                    Smartgeo.get_('reports', function(reports){
                        reports = reports || [] ;
                        reports.push(report);
                        Smartgeo.set_('reports', reports, function(){
                            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                        });
                    });
                    deferred.reject();
                    deferred.notify();
                });
            return deferred.promise;
        }
    };
    return Report ;
});
