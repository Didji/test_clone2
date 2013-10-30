angular.module('smartgeomobile')
    .filter('customDateFilter', function() {
        return function(date) {
            var dateOut = date.slice(3,5) + '/' + date.slice(0,2) + '/' + date.slice(6) ;
            dateOut = new Date(dateOut);
            return dateOut.getTime() ;
        };
    });
