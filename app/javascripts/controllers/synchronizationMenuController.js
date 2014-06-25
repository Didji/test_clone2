angular.module('smartgeomobile').controller('synchronizationMenuController', ["$scope", "$rootScope", "$http", "$location", "Smartgeo", "$window", "i18n", "$timeout", "AssetFactory", "G3ME", "Report", "$filter", function ($scope, $rootScope, $http, $location, Smartgeo, $window, i18n, $timeout, Asset, G3ME, Report, $filter) {

    'use strict';

    var synchronizationCheckTimeout             = 1000 * 60 * 10,
        reportsSynchronizationCheckTimeoutId    = false,
        assetsSynchronizationCheckTimeoutId     = false,
        synchronizationTimeout                  = 1000 * 60,
        reportsSynchronizationTimeoutId         = false,
        assetsSynchronizationTimeoutId          = false;

    $scope.initialize = function () {

        reportsSynchronizationCheckTimeoutId = setInterval(Report.checkSynchronizedReports,synchronizationCheckTimeout);

        Report.getAll(function (reports) {
            $rootScope.reports          = reports || [];
            $rootScope.reports._byUUID  = {};

            for (var i = 0; i < reports.length; i++) {
                var report = $rootScope.reports[i] ;
                $rootScope.reports._byUUID[report.uuid] = report ;
                if(report.synced && !report.hide){
                   $scope.hideReport(report);
                }
            }

            $scope.synchronizeReports();
            Report.checkSynchronizedReports();
        });

        // TODO: handle census assets (@gulian)

    };

    $scope.synchronizeReport  = function (UIreport, callback) {
        return Report.synchronize(UIreport, function(report){
            UIreport = report || UIreport ;
            if(report.synced && !report.hide){
                $scope.hideReport(report, 0);
            }
            (callback||function(){})()
        });
    };

    $scope.synchronizeReports = function (i) {

        if($scope.globalSynchronizationIsInProgress && !i){
            return false ;
        }

        clearTimeout(reportsSynchronizationTimeoutId);

        $scope.globalSynchronizationIsInProgress = true ;

        Report.getAll(function(reports){

            for (i = i || 0  ; i< reports.length; i++) {
                if(!$rootScope.reports._byUUID[reports[i].uuid].synced){
                    return $scope.synchronizeReport($rootScope.reports._byUUID[reports[i].uuid], function(){
                        $scope.synchronizeReports(i+1);
                    })
                }
            }

            $scope.$apply(function(){
                $scope.globalSynchronizationIsInProgress = false ;
            });

            reportsSynchronizationTimeoutId = setTimeout($scope.synchronizeReports, synchronizationTimeout);
        });

    };

    $scope.synchronizeAsset  = function (UIasset, callback) {
        // TODO: implement function (@gulian)
    };

    $scope.synchronizeAssets = function (i) {
        // TODO: implement function (@gulian)
    };

    $scope.deleteReport = function(report, $index){
        var text ;
        try {
            text = 'Êtes vous sûr de vouloir supprimer le compte-rendu ' + site.activities[report.activity].label + ' saisi le ' + $filter('date')(report.timestamp, 'dd/MM à HH:mm') + " ? Cette action est définitive. Le compte-rendu ne pourra être récupéré." ;
        } catch(e){
            text = 'Êtes vous sûr de vouloir supprimer le compte-rendu saisi le ' + $filter('date')(report.timestamp, 'dd/MM à HH:mm') + " ? Cette action est définitive. Le compte-rendu ne pourra être récupéré." ;
        }

        alertify.confirm( text, function (yes) {
            if (!yes) {  return; }
            $rootScope.reports.splice($index, 1);
            $scope.$apply();
            Report.deleteInDatabase(report);
        });
    };

    $scope.deleteAsset = function(asset, $index){
        // TODO: implement function (@gulian)
    };

    $scope.hideReport = function(report, timeout){
        $timeout(function() {
            $rootScope.reports._byUUID[report.uuid].hide = true ;
            Report.updateInDatabase($rootScope.reports._byUUID[report.uuid]);
            $scope.$apply();
        }, timeout || 3000) ;
    };

    $scope.hideAsset = function(asset){
        // TODO: implement function (@gulian)
    };

    $scope.toBeSyncLength = function () {
        // TODO: handle census assets (@gulian)
        var reports = $rootScope.reports || [] , size = 0;
        for (var i = 0; i < reports.length; i++) if (!reports[i].synced)  size++;
        return size;
    };

    $scope.uninstallCurrentSite = function () {
        alertify.confirm(i18n.get('_SYNC_UNINSTALL_CONFIRM_MESSAGE_', $rootScope.site.label), function (e) {
            if (e) {
                $location.path('sites/uninstall/' + $rootScope.site.id);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

}]);
