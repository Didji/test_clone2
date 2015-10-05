(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .filter( 'todayMissions', todayMissions )
        .filter( 'specificDayMissions', specificDayMissions )
        .filter( 'lateMissions', lateMissions )
        .filter( 'doneMissions', doneMissions )
        .filter( 'sanitizeDate', sanitizeDate )
        .filter( 'opennedMissions', opennedMissions )
        .filter( 'opennedCalls', opennedCalls );

    todayMissions.$inject = ["$filter"];

    function todayMissions($filter) {
        /**
         * @name _todayMissions
         * @desc
         */
        function _todayMissions(in_) {
            var out = {},
                mission,
                begin, end,
                now = new Date(),
                tomorrow = new Date(),
                startsToday, endsToday, overlapsToday;
            now.setHours( 0, 0, 0, 0 ); // MINUIT
            tomorrow.setHours( 23, 59, 59, 99 );

            now = now.getTime();
            tomorrow = tomorrow.getTime();

            for (var id in in_) {
                mission = in_[id];
                begin = $filter( 'sanitizeDate' )( mission.begin );
                end = $filter( 'sanitizeDate' )( mission.end );

                startsToday = (begin >= now && begin <= tomorrow);
                endsToday = (end >= now && end <= tomorrow);
                overlapsToday = (begin <= now && end >= tomorrow);
                if ((startsToday || endsToday || overlapsToday) &&
                    (mission.assets.length || !mission.activity) &&
                    !mission.isLate) {
                    out[id] = mission;
                }
            }
            return out;
        }
        return _todayMissions;
    }

    specificDayMissions.$inject = ["$filter"];

    function specificDayMissions($filter) {
        /**
         * @name _specificDayMissions
         * @desc
         */
        function _specificDayMissions(in_, day) {
            var out = [],
                mission;
            day *= 1;
            for (var id in in_) {
                mission = in_[id];
                if ($filter( 'sanitizeDate' )( mission.end ) > day && $filter( 'sanitizeDate' )( mission.begin ) >= day && $filter( 'sanitizeDate' )( mission.begin ) < (day + 86400000) && (mission.assets.length || !mission.activity)) {
                    out.push( mission );
                }
            }
            return out;
        }
        return _specificDayMissions;
    }

    lateMissions.$inject = ["$filter"];

    function lateMissions($filter) {
        /**
         * @name _lateMissions
         * @desc
         */
        function _lateMissions(in_) {
            var out = [],
                mission,
                now = (new Date()).getTime();
            for (var id in in_) {
                mission = in_[id];
                mission.sanitizedEnd = mission.sanitizedEnd || $filter( 'sanitizeDate' )( mission.end );
                mission.sanitizedBegin = mission.sanitizedBegin || $filter( 'sanitizeDate' )( mission.begin );
                if (mission.sanitizedEnd < now && (mission.assets.length || !mission.activity)) {
                    mission.isLate = true;
                    out.push( mission );
                }
            }
            out.sort( function(a, b) {
                return a.sanitizedEnd - b.sanitizedEnd;
            } );
            return out;
        }
        return _lateMissions;
    }

    doneMissions.$inject = [];

    function doneMissions() {
        /**
         * @name _doneMissions
         * @desc
         */
        function _doneMissions(in_) {
            var out = {},
                mission;
            for (var id in in_) {
                mission = in_[id];
                if (!(mission.assets.length || !mission.activity)) {
                    mission.isLate = false;
                    out[id] = mission;
                }
            }
            return out;
        }
        return _doneMissions;
    }

    sanitizeDate.$inject = [];

    function sanitizeDate() {
        /**
         * @name _sanitizeDate
         * @desc
         */
        function _sanitizeDate(date) {
            return date && (new Date( date.slice( 3, 5 ) + '/' + date.slice( 0, 2 ) + '/' + date.slice( 6 ) )).getTime() || '';
        }
        return _sanitizeDate;
    }

    opennedMissions.$inject = ["Site"];

    function opennedMissions(Site) {
        /**
         * @name _opennedMissions
         * @desc
         */
        function _opennedMissions(in_, asset) {
            var out = [];
            for (var i in in_) {
                if (!in_[i].activity) {
                    continue;
                }
                var isCompatible = Site.current.activities._byId[+in_[i].activity.id].okeys[0] === asset.okey;
                if (isCompatible && in_[i].openned) {
                    out.push( in_[i] );
                }
            }
            return out;
        }
        return _opennedMissions;
    }

    opennedCalls.$inject = [];

    function opennedCalls() {
        /**
         * @name _opennedCalls
         * @desc
         */
        function _opennedCalls(in_) {
            var out = [];
            for (var i in in_) {
                if (!in_[i].activity && in_[i].openned) {
                    out.push( in_[i] );
                }
            }
            return out;
        }
        return _opennedCalls;
    }

})();
