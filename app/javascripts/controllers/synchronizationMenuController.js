angular.module('smartgeomobile').controller('synchronizationMenuController', function ($scope, $rootScope, $http, $location, Smartgeo, $window, i18n, $timeout) {

    'use strict';

    $scope.reports = [];

    $scope.initialize = function () {

        $rootScope.$on("DEVICE_IS_ONLINE", function () {
            $scope.syncAll();
        });

        $scope.updateReportList();

        Smartgeo.registerInterval("UPDATE_SYNCCENTER", function () {
            $scope.updateReportList();
        }, 5000);

        Smartgeo.registerInterval("SYNC_REPORTS", function () {
            $scope.syncAll();
        }, 60000);

    };

    $scope.updateReportList = function () {
        Smartgeo.get_('reports', function (reports) {
            reports = reports || [];
            $scope.reports = [];
            for (var i = 0; i < reports.length; i++) {
                if (!reports[i].synced) {
                    $scope.reports.push(reports[i]);
                }
            }
            Smartgeo.set_('reports', $scope.reports, function () {
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
            });
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.reports.length);
        });
        Smartgeo.get_('census', function (census) {
            census = census || [];
            var uuids = {} ;
            $scope.census = [];
            for (var i = 0; i < census.length; i++) {
                // if(uuids[census[i].uuid]){
                //     continue  ;
                // }
                // uuids[census[i].uuid] = true
                if (!census[i].synced) {
                    $scope.census.push(census[i]);
                }
            }
            Smartgeo.set_('census', $scope.census, function () {
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.census.length);
            });
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE", $scope.census.length);
        });
    };

    $scope.syncAll = function () {
        for (var i = 0; i < $scope.reports.length; i++) {
            $scope.sync(i);
        }
        for (i = 0; i < $scope.census.length; i++) {
            $scope.syncCensus(i);
        }
    };

    $scope.sync = function ($index, callback) {
        if ($scope.reports[$index].synced) {
            return false;
        }
        $scope.reports[$index].syncInProgress = true;
        $http.post(Smartgeo.get('url') + 'gi.maintenance.mobility.report.json', $scope.reports[$index], {
            timeout: 55000
        })
            .success(function () {
                if (!$scope.reports[$index]) {
                    return;
                }
                $scope.reports[$index].syncInProgress = false;
                $scope.reports[$index].synced = true;

                Smartgeo.set_('reports', $scope.reports, function () {
                    $timeout(function () {
                        if ($scope.reports[$index]) {
                            $scope.reports[$index].hide = true;
                        }
                        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                    }, 3000);
                });
            }).error(function (data, code) {
                if (!$scope.reports[$index]) {
                    return;
                }
                if (Smartgeo.get('online') && code !== 0) {
                    if (data.error) {
                        alertify.error(data.error.text);
                    } else {
                        alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                    }
                }
                $scope.reports[$index].syncInProgress = false;
            });
    };

    $scope.syncCensus = function ($index, callback) {
        if ($scope.census[$index].synced) {
            return false;
        }
        $scope.census[$index].syncInProgress = true;
        $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.census.json'), $scope.census[$index], {
            timeout: 55000
        })
            .success(function () {
                if (!$scope.census[$index]) {
                    return;
                }
                $scope.census[$index].syncInProgress = false;
                $scope.census[$index].synced = true;

                Smartgeo.set_('census', $scope.census, function () {
                    $timeout(function () {
                        if ($scope.census[$index]) {
                            $scope.census[$index].hide = true;
                        }
                        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                    }, 3000);
                });
            }).error(function (data, code) {
                if (!$scope.census[$index]) {
                    return;
                }
                if (Smartgeo.get('online') && code !== 0) {
                    if (data.error) {
                        alertify.error(data.error.text);
                    } else {
                        alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                    }
                }
                $scope.census[$index].syncInProgress = false;
            });
    };

    $scope.__deleteCensus = function ($index) {
        $scope.census = $scope.census.slice(0, $index).concat($scope.census.slice($index + 1, $scope.census.length));
        Smartgeo.set_('census', $scope.census, function () {
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
        });
    };

    $scope.__delete = function ($index) {
        $scope.reports = $scope.reports.slice(0, $index).concat($scope.reports.slice($index + 1, $scope.reports.length));
        Smartgeo.set_('reports', $scope.reports, function () {
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
        });
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

    $scope.deleteWithUUID = function (uuid) {
        for (var i = 0; i < $scope.reports.length; i++) {
            if ($scope.reports[i].uuid === uuid) {
                $scope.reports.splice(i, 1);
                console.log('spliced !');
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                break;
            }
        }
    };

    $scope.toBeSyncLenght = function () {
        var len = 0;
        for (var i = 0; i < $scope.reports.length; i++) {
            if (!$scope.reports[i].synced) {
                len++;
            }
        }
        for (i = 0; i < $scope.census.length; i++) {
            if (!$scope.census[i].synced) {
                len++;
            }
        }
        return len;
    };

});
