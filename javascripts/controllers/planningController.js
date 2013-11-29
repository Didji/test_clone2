/**
 * @ngdoc object
 * @name planningController
 * @description
 * Planning controller
 */

angular.module('smartgeomobile').controller('planningController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, Mission, $location, $filter, G3ME){

    'use strict';

    /**
     * @ngdoc property
     * @name planningController#DAY_TO_MS
     * @propertyOf planningController
     * @const
     * @description Day to milliseconds
     */
    $scope.DAY_TO_MS = 86400000 ;

    /**
     * @ngdoc method
     * @name planningController#remove1day
     * @methodOf planningController
     * @description
     * Go to preview day with mission(s)
     */
    $scope.remove1day = function(){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay -= $scope.DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0){
            $scope.remove1day();
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        }
    };

    /**
     * @ngdoc method
     * @name planningController#gototoday
     * @methodOf planningController
     * @description
     * Go to current day
     */
    $scope.gototoday = function(){
        $scope.dayToDisplay = (new Date()).getTime();
        Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
    };

    /**
     * @ngdoc method
     * @name planningController#add1day
     * @methodOf planningController
     * @description
     * Go to next day
     */
    $scope.add1day = function(){
        $scope.dayToDisplay = new Date($scope.dayToDisplay).getTime();
        $scope.dayToDisplay += $scope.DAY_TO_MS ;
        if( Object.keys($filter('todaysMissions')($scope.missions,$scope.dayToDisplay)).length +
            Object.keys($filter('moreThanOneDayButTodaysMissions')($scope.missions,$scope.dayToDisplay)).length === 0 ){
            $scope.add1day();
        } else {
            Smartgeo.set('lastUsedPlanningDate', $scope.dayToDisplay);
        }
    };

    /**
     * @ngdoc method
     * @name planningController#synchronize
     * @methodOf planningController
     * @description
     * Get mission from remote server
     */
    $scope.synchronize = function(){
        Mission
            .query()
            .success( function(results){
                $scope.missions = results.results;
                console.log( $scope.missions);
                $scope.updateCount();
                Smartgeo.set('missions', $scope.missions);
            })
            .error( function(){
                /* TODO : n'afficher le message que lorsque l'on est en ligne */
                alertify.error('Erreur lors de la mise à jour des missions');
            });
    };

    /**
     * @ngdoc method
     * @name planningController#initialize
     * @methodOf planningController
     * @description
     * Controller initialization :
     * <ul>
     *     <li>Get local mission(s)</li>
     *     <li>Reduce mission.assets array considering pending reports ({@link planningController#removeObsoleteMission $scope.removeObsoleteMission})</li>
     *     <li>Send pending missions related reports (TODO)</li>
     *     <li>Get remote mission(s) ({@link planningController#synchronize $scope.synchronize}) </li>
     *     <li>Set current day : today at midnight or last viewed day ({@link planningController#getMidnightTimestamp $scope.getMidnightTimestamp})</li>
     *     <li>Initialize counts ({@link planningController#updateCount $scope.updateCount}) </li>
     * </ul>
     */
    $scope.initialize = function(){
        $scope.missions = Smartgeo.get('missions');
        Smartgeo.get_('reports', function(reports){
            $scope.removeObsoleteMission(reports);
            $scope.synchronize();
            $scope.updateCount();
        });
        $scope.dayToDisplay =  Smartgeo.get('lastUsedPlanningDate') || $scope.getMidnightTimestamp();
    };

    /**
     * @ngdoc method
     * @name planningController#getMidnightTimestamp
     * @methodOf planningController
     * @description
     * @returns {Date} This morning midnight timestamp
     */
     $scope.getMidnightTimestamp = function(){
        var n = (new Date()) ;
        n -= (n.getMilliseconds()+n.getSeconds()*1000+n.getMinutes()*60000+n.getHours()*3600000).getTime();
        return new Date(n) ;
     };

    /**
     * @ngdoc method
     * @name planningController#removeObsoleteMission
     * @methodOf planningController
     * @description
     * Reduce mission.assets array considering pending reports
     */
    $scope.removeObsoleteMission = function(reports){
        var missions = Smartgeo.get('missions');
        for(var i in reports){
            if(missions[reports[i].mission]){
                var pendingAssets = reports[i].assets,
                    mission = missions[reports[i].mission] ;
                for(var j = 0 , length = mission.assets.length; j < length ; j++){
                    if( pendingAssets.indexOf(mission.assets[j]) !== -1){
                        mission.done.push(mission.assets[j]);
                        mission.assets.splice(j--, 1);
                        length--;
                    }
                }
            }
        }
        $scope.missions = missions;
    };

    /**
     * @ngdoc method
     * @name planningController#updateCount
     * @methodOf planningController
     * @description
     * Update number in left and right arrows
     */
    $scope.updateCount = function(missions, today){
        $scope.beforeToday = $scope.afterToday = 0 ;
        for(var i in $scope.missions){
            var mission = $scope.missions[i], f = $filter('customDateFilter');
            if(!mission.assets.length){
                continue;
            }
            $scope.beforeToday += f(mission.begin) < ($scope.dayToDisplay - $scope.DAY_TO_MS) ? 1 : 0 ;
            $scope.afterToday  += f(mission.end  ) > ($scope.dayToDisplay + $scope.DAY_TO_MS) ? 1 : 0 ;
        }
    };

    $scope.openMission = function($index){
        var mission = $scope.missions[$index] ;
        mission.openned = !mission.openned ;

        if(mission.openned || !mission.assetsCache|| !mission.extent){

            var fakeGeoJSON = {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [[4.261300563812256,45.524449964858874],[4.261418581008911,45.524645398053835],[4.261536598205566,45.52490848012874],[4.261622428894043,45.5250813619652],[4.261804819107056,45.52545719021159],[4.261869192123413,45.52563758687798],[4.2619335651397705,45.52579543348656],[4.262040853500366,45.526020927873326],[4.262040853500366,45.52629151994429],[4.262223243713379,45.526336618496245],[4.26243782043457,45.52647191393514],[4.262609481811523,45.52647191393514],[4.2629313468933105,45.52647191393514],[4.263499975204468,45.52647943033888],[4.264079332351685,45.52647943033888],[4.264723062515259,45.52641929908089],[4.26545262336731,45.526381717012015],[4.265645742416382,45.52638923342779],[4.26569938659668,45.52661472543431],[4.2657530307769775,45.52678760202713],[4.265795946121216,45.526915380036876],[4.26618218421936,45.52692289638136],[4.266568422317505,45.526832700181366],[4.267319440841675,45.526592176274335],[4.267308712005615,45.52641929908089],[4.267308712005615,45.526253937790045],[4.267308712005615,45.52614870762459],[4.267791509628296,45.52611864182686],[4.268156290054321,45.52610360892198],[4.268617630004883,45.52607354310015],[4.26892876625061,45.526028444337314],[4.269701242446899,45.52588563134973],[4.269840717315674,45.52578040049529],[4.269905090332031,45.52562255384455],[4.2699480056762695,45.52538202476317],[4.2698729038238525,45.525201627277234],[4.269776344299316,45.52499867941405],[4.269744157791138,45.52485586381217],[4.269626140594482,45.52472056448648],[4.269518852233887,45.5246829812827],[4.269443750381469,45.52452513155265],[4.269379377365112,45.52435224800681],[4.269229173660278,45.524179363929655],[4.268724918365478,45.52371332594481],[4.268499612808227,45.52356299028744],[4.268274307250977,45.52340513741482],[4.268091917037964,45.523307418747905],[4.267963171005249,45.523284868262216],[4.267920255661011,45.52320969991127],[4.267759323120116,45.52303681232294],[4.267512559890746,45.52289399174057],[4.267212152481079,45.52270606936925],[4.267104864120483,45.5226384171619],[4.266858100891113,45.52247304475705],[4.2666542530059814,45.52234525665672],[4.266321659088135,45.522172366411915],[4.266096353530884,45.52194685659852],[4.265892505645752,45.52180403324919],[4.26568865776062,45.521698794759764],[4.26544189453125,45.521540936656564],[4.265238046646118,45.521375561025756],[4.265098571777344,45.521322941404954],[4.264926910400391,45.521375561025756],[4.264787435531616,45.521353009765726],[4.2646801471710205,45.52122521912139],[4.264723062515259,45.521150048018576],[4.2648303508758545,45.52108991106398],[4.264658689498901,45.52089446551768]]
                    }
                }]
            };

            $scope.fakeGeoJSONLayer = $scope.fakeGeoJSONLayer || L.geoJson(fakeGeoJSON, {
                style: {
                    "color": "red",
                    "weight": 7,
                    "opacity": 0.80
                }
            });

            $scope.fakeGeoJSONLayer.addTo(G3ME.map);

            if(!mission.pendingAssetsExtent || !mission.assetsCache ){
                if(mission.assets.length){
                    Smartgeo.findAssetsByGuids($scope.site, mission.assets, function(assets){
                        if( assets.length === 0 ){
                            alertify.log("Les objets de cette missions n'ont pas été trouvés.");
                            return ;
                        }
                        mission.assetsCache         = assets ;
                        mission.pendingAssetsExtent = G3ME.getExtentsFromAssetsList(assets);
                        mission.selectedAssets      = 0;
                        mission.extent = G3ME.getExtentsFromAssetsList(mission.assetsCache);

                        $scope.highlightMission(mission);
                        $scope.$apply();
                        $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
                    });
                }
            } else {
                $scope.highlightMission(mission);
            }
        } else {
            G3ME.map.removeLayer($scope.fakeGeoJSONLayer);
            $rootScope.$broadcast('UNHIGHLIGHT_ASSETS_FOR_MISSION', mission);
        }
    };

    $scope.locateMission = function($index){
        var mission = $scope.missions[$index] ;
        if(mission.extent){
            $rootScope.$broadcast('__MAP_SETVIEW__', mission.extent);
        } else {
            alertify.log("Les objets de cette missions n'ont pas été trouvés.");
        }
    };

    $scope.showReport = function($index){
        var mission = $scope.missions[$index],
            selectedAssets = [];
        for (var i = 0; i < mission.assetsCache.length; i++) {
            if(mission.assetsCache[i].selected){
                selectedAssets.push(mission.assetsCache[i].id);
            }
        }
        $location.path('report/'+$rootScope.site.id+'/'+mission.activity.id+'/'+selectedAssets.join(',')+'/'+mission.id);
    };

    $scope.highlightMission = function(mission){
        $rootScope.$broadcast('HIGHLIGHT_ASSETS_FOR_MISSION', mission, null,
            /* marker click handler */
            function(mission, id){
                var asset = mission.assetsCache[id] ;
                asset.selected = !!!asset.selected ;
                mission.selectedAssets += asset.selected ? 1 : -1   ;
                $rootScope.$broadcast('TOGGLE_ASSET_MARKER_FOR_MISSION', asset);
                if(!$scope.$$phase) {
                    $scope.$apply();
                }
            });
    };

    $scope.changeVisibility = function($index){
        $scope.missions[$index].icon = $scope.missions[$index].icon === 'fa-check-circle-o' ? 'fa-circle-o' : 'fa-check-circle-o' ;
    };

    $scope.initialize() ;

});
