angular.module('smartgeomobile').controller('synchronizationMenuController', ["$scope", "$rootScope", "$http", "$location", "Smartgeo", "$window", "i18n", "$timeout", "AssetFactory", "G3ME", "Report", "$filter", function ($scope, $rootScope, $http, $location, Smartgeo, $window, i18n, $timeout, Asset, G3ME, Report, $filter) {

    'use strict';

    var synchronizationCheckTimeout             = 1000 * 60 * 10,
        synchronizationTimeout                  = 1000 * 60,
        reportsSynchronizationCheckTimeoutId    = false,
        assetsSynchronizationCheckTimeoutId     = false,
        reportsSynchronizationTimeoutId         = false,
        assetsSynchronizationTimeoutId          = false;

    reportsSynchronizationCheckTimeoutId = setInterval(Report.checkSynchronizedReports ,synchronizationCheckTimeout);
    reportsSynchronizationCheckTimeoutId = setInterval( Asset.checkSynchronizedAssets  ,synchronizationCheckTimeout);

    $scope.initialize = function (justRefresh) {

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
            if(!justRefresh){
                $scope.synchronizeReports();
                Report.checkSynchronizedReports();
            }
        });

         Asset.getAll(function (assets) {
            $rootScope.censusAssets          = assets || [];
            $rootScope.censusAssets._byUUID  = {};

            for (var i = 0; i < assets.length; i++) {
                var asset = $rootScope.censusAssets[i] ;
                $rootScope.censusAssets._byUUID[asset.uuid] = asset ;
                if(asset.synced && !asset.hide){
                   $scope.hideAsset(asset);
                }
            }
            if(!justRefresh){
                $scope.synchronizeAssets();
                // Asset.checkSynchronizedAssets();
            }

        });

    };

    $rootScope.refreshSyncCenter = function(){
        $scope.initialize(true);
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

    $scope.synchronizeReports = function (i, callback) {

        if($scope.globalReportsSynchronizationIsInProgress && !i){
            return false ;
        }

        clearTimeout(reportsSynchronizationTimeoutId);

        $scope.globalReportsSynchronizationIsInProgress = true ;

        Report.getAll(function(reports){

            for (i = i || 0  ; i< reports.length; i++) {
                if(!$rootScope.reports._byUUID[reports[i].uuid].synced){
                    return $scope.synchronizeReport($rootScope.reports._byUUID[reports[i].uuid], function(){
                        $scope.synchronizeReports(i+1);
                    })
                }
            }

            $scope.$apply(function(){
                $scope.globalReportsSynchronizationIsInProgress = false ;
            });

            (callback || function(){})();
            reportsSynchronizationTimeoutId = setTimeout($scope.synchronizeReports, synchronizationTimeout);
        });

    };

    $scope.synchronizeAsset  = function (UIasset, callback) {
        return Asset.synchronize(UIasset, function(asset){
            UIasset = asset || UIasset ;
            if(asset.synced && !asset.hide){
                $scope.hideReport(asset, 0);
            }
            (callback||function(){})()
        });
    };

    $scope.synchronizeAssets = function (i, callback) {
        if($scope.globalAssetsSynchronizationIsInProgress && !i){
            return false ;
        }

        clearTimeout(assetsSynchronizationTimeoutId);

        $scope.globalAssetsSynchronizationIsInProgress = true ;

        Asset.getAll(function(assets){

            for (i = i || 0  ; i< assets.length; i++) {
                if(!$rootScope.censusAssets._byUUID[assets[i].uuid].synced){
                    return $scope.synchronizeAsset($rootScope.censusAssets._byUUID[assets[i].uuid], function(){
                        $scope.synchronizeAssets(i+1);
                    })
                }
            }

            $scope.$apply(function(){
                $scope.globalAssetsSynchronizationIsInProgress = false ;
            });

            (callback || function(){})();
            assetsSynchronizationTimeoutId = setTimeout($scope.synchronizeAssets, synchronizationTimeout);
        });

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
        var text = "Êtes vous sûr de vouloir supprimer cet objet ? Cette action est définitive. L'objet ne pourra être récupéré." ;

        alertify.confirm( text, function (yes) {
            if (!yes) {  return; }
            $rootScope.censusAssets.splice($index, 1);
            $scope.$apply();
            Asset.deleteInDatabase(asset);
        });
    };

    $scope.hideReport = function(report, timeout){
        $timeout(function() {
            $rootScope.reports._byUUID[report.uuid].hide = true ;
            Report.updateInDatabase($rootScope.reports._byUUID[report.uuid]);
            $scope.$apply();
        }, timeout || 3000) ;
    };

    $scope.hideAsset = function(asset, timeout){
        $timeout(function() {
            $rootScope.censusAssets._byUUID[asset.uuid].hide = true ;
            Asset.updateInDatabase($rootScope.censusAssets._byUUID[asset.uuid]);
            $scope.$apply();
        }, timeout || 3000) ;
    };

    $scope.toBeSyncLength = function () {
        var reports = $rootScope.reports || [] ,censusAssets = $rootScope.censusAssets || [] , size = 0;
        for (var i = 0; i < reports.length; i++)        if (!reports[i].synced)       size++;
        for (var i = 0; i < censusAssets.length; i++)   if (!censusAssets[i].synced)  size++;
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
