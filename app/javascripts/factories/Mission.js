angular.module('smartgeomobile').factory('Mission', function($http, Smartgeo, $q){

    'use strict';

    var Mission = {
        query : function(){
            return $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.showOT.json'));
        },
        poll : function(){
            return $http.get(Smartgeo.getServiceUrl('gi.maintenance.mobility.poll.json'));
        }
    };

    return Mission ;

});
