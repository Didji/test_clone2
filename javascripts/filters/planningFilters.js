var DAY_TO_MS      = 86400000 ;

angular.module('smartgeomobile')
    .filter('customDateFilter', function() {
        return sanitizeDate;
    }).filter('dateForInput', function() {
        return function(date){
            date = new Date(date);
            console.log((date.getYear()+1900)+"-"+(date.getMonth()+1)+"-"+date.getDate());
            return (date.getYear()+1900)+"-"+(date.getMonth()+1)+"-"+date.getDate() ;
        };
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
                if(
                    mission.assets.length && (
                        /* mission du jour */
                        ( missionbegin >= daybegin && missionend <= dayend ) ||
                        /* mission qui commencent aujourdhui et finissent un autre jour */
                        ( missionbegin >= daybegin && missionbegin <= dayend && missionend >= dayend)
                    )
                ){
                    missionsOut[mission.id] = mission;
                }
            }
            return missionsOut;
        };
    }).filter('moreThanOneDayButTodaysMissions', function() {
        return function(missionsIn, date) {
            date = new Date(date);
            var missionsOut = {}, mission, missionbegin, missionend,
            daybegin = new Date((date.getMonth()+1)+'/'+date.getDate()+'/'+(date.getYear()+1900) ).getTime(),
            dayend   = daybegin + DAY_TO_MS;

            for(var i in missionsIn){
                mission         = missionsIn[i];
                missionbegin    = sanitizeDate(mission.begin);
                missionend      = sanitizeDate(mission.end);
                if(mission.assets.length && missionbegin < daybegin && missionend > daybegin){
                    missionsOut[mission.id] = mission;
                }
            }
            return missionsOut;
        };
    }).filter('todaysMissionsOrMoreThanOneDayButTodaysMissionsButNotLate', function() {
        return function(missionsIn, date) {
            date = new Date(date);
            var missionsOut = {}, mission, missionbegin, missionend,
            daybegin = new Date((date.getMonth()+1)+'/'+date.getDate()+'/'+(date.getYear()+1900) ).getTime(),
            dayend   = daybegin + DAY_TO_MS;
            var now = (new Date()).getTime();

            for(var i in missionsIn){
                mission         = missionsIn[i];
                missionbegin    = sanitizeDate(mission.begin);
                missionend      = sanitizeDate(mission.end);
                if( (mission.assets.length && missionend > now) &&
                    ((mission.assets.length && missionbegin < daybegin && missionend > daybegin)
                    ||
                    (mission.assets.length && (
                        /* mission du jour */
                        ( missionbegin >= daybegin && missionend <= dayend ) ||
                        /* mission qui commencent aujourdhui et finissent un autre jour */
                        ( missionbegin >= daybegin && missionbegin <= dayend && missionend >= dayend))))

                    ){
                    missionsOut[mission.id] = mission;
                }
            }
            return missionsOut;
        };
    }).filter('lateMission', function() {
        return function(missionsIn, date) {
            date = new Date(date);
            var missionsOut = {}, mission, missionbegin, missionend,
            daybegin = new Date((date.getMonth()+1)+'/'+date.getDate()+'/'+(date.getYear()+1900) ).getTime(),
            dayend   = daybegin + DAY_TO_MS;
            var now = (new Date()).getTime();
            for(var i in missionsIn){
                mission         = missionsIn[i];
                missionend      = sanitizeDate(mission.end);
                if( mission.assets.length && missionend < now ){
                    mission.isLate=true;
                    missionsOut[mission.id] = mission;
                }
            }
            return missionsOut;
        };
    }).filter('todaysMissionsButFinished', function() {
        return function(missionsIn, date) {
            date = new Date(date);
            var missionsOut = {}, mission, missionbegin, missionend,
            daybegin = new Date((date.getMonth()+1)+'/'+date.getDate()+'/'+(date.getYear()+1900) ).getTime(),
            dayend   = daybegin + DAY_TO_MS;
            var now = (new Date()).getTime(), j = 0;
            for(var i in missionsIn){
                mission         = missionsIn[i];
                missionbegin    = sanitizeDate(mission.begin);
                missionend      = sanitizeDate(mission.end);

                if(
                    (!mission.assets.length) &&
                        (
                            ( missionbegin < daybegin && missionend > daybegin)  ||
                            /* mission du jour */
                            ( missionbegin >= daybegin && missionend <= dayend ) ||
                            /* mission qui commencent aujourdhui et finissent un autre jour */
                            ( missionbegin >= daybegin && missionbegin <= dayend && missionend >= dayend)
                        )
                ){
                    // console.log(mission)
                    mission.isLate=false;
                    missionsOut[mission.id] = mission;
                    j++;
                }
            }
            // console.log(j);
            return j > 0 ? missionsOut : [];
        };
    }).filter('sanitizeDate', function() {
        return function(dateIn) {
            return sanitizeDate(dateIn);
        };
    });


function sanitizeDate(date){
    if(!date){
        return '';
    }
    var dateOut = date.slice(3,5) + '/' + date.slice(0,2) + '/' + date.slice(6) ;
    dateOut = new Date(dateOut);
    return dateOut.getTime() ;
}