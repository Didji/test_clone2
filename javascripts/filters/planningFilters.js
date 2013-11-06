var DAY_TO_MS      = 86400000 ;
var HALF_DAY_TO_MS = 43200000 ;


angular.module('smartgeomobile')
    .filter('customDateFilter', function() {
        return sanitizeDate;
    }).filter('todaysMissions', function() {
        return function(missionsIn, date) {
            date = new Date(date);
            var missionsOut = {}, mission, missionbegin, missionend,
            daybegin = new Date((date.getMonth()+1)+'/'+date.getDate()+'/'+(date.getYear()+1900) ).getTime(),
            dayend   = daybegin + DAY_TO_MS;

            for(var i in missionsIn){
                mission         = missionsIn[i];
                missionbegin    = sanitizeDate(mission.begin);
                missionend      = sanitizeDate(mission.end);
                if(missionbegin >= daybegin && missionend <= dayend){
                    missionsOut[mission.id] = mission;
                }
            }
            return missionsOut;
        };
    });


function sanitizeDate(date){
    var dateOut = date.slice(3,5) + '/' + date.slice(0,2) + '/' + date.slice(6) ;
    dateOut = new Date(dateOut);
    return dateOut.getTime() ;
}
