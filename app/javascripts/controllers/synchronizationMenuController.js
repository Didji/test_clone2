angular.module('smartgeomobile').controller('synchronizationMenuController', function ($scope, $rootScope, $http, $location, Smartgeo, $window, i18n, $timeout, AssetFactory, G3ME) {

    'use strict';

    $scope.reports = [];
    $scope.census  = [];

    $scope.initialize = function () {
        $rootScope.site.activities._byId = {};
        for (var i = 0; i < $rootScope.site.activities.length; i++) {
            $rootScope.site.activities._byId[$rootScope.site.activities[i].id] = $rootScope.site.activities[i];
        }

        $rootScope.$on("DEVICE_IS_ONLINE", function () {
            $scope.syncAll();
        });

        $scope.updateReportList();

        Smartgeo.registerInterval("UPDATE_SYNCCENTER", function () {
            $scope.updateReportList();
            $scope.syncAll();
        }, 60000);

    };

    $rootScope.syncCenterUpdateReportList = $scope.updateReportList = function () {
        Smartgeo.get_('reports', function (reports) {
            reports = reports || [];
            $scope.reports = [];
            for (var i = 0; i < reports.length; i++) {
                $scope.reports.push(reports[i]);
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
        Smartgeo.get_('census', function (census) {
            census = census || [];
            var uuids = {} ;
            $scope.census = [];
            for (var i = 0; i < census.length; i++) {
                $scope.census.push(census[i]);
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };

    $scope.syncAll = function () {
        for (var i = 0; i < $scope.reports.length; i++) {
            $scope.sync($scope.reports[i]);
        }
        for (i = 0; i < $scope.census.length; i++) {
            $scope.syncCensus($scope.census[i]);
        }
    };

    $scope.eraseAllSynced = function () {
        alertify.confirm("Êtes vous sûr de vouloir vider l'historique de synchronisation ?", function (yes) {
            if (yes) {
                Smartgeo.get_('reports', function (reports) {
                    reports = reports || [];
                    $scope.reports = [];
                    for (var i = 0; i < reports.length; i++) {
                        if(!reports[i].synced){
                            $scope.reports.push(reports[i]);
                        }
                    }
                    Smartgeo.set_('reports', $scope.reports, function () {
                        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    });
                });
                Smartgeo.get_('census', function (census) {
                    census = census || [];
                    var uuids = {} ;
                    $scope.census = [];
                    for (var i = 0; i < census.length; i++) {
                        if(!census[i].synced){
                            $scope.census.push(census[i]);
                        }
                    }
                    Smartgeo.set_('census', $scope.census, function () {
                        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    });

                });
            }
        });
    };

    $scope.sync = function (report, force) {
        if (report.synced && !force) {
            return false;
        }
        report.syncInProgress = true;
        $http.post(Smartgeo.get('url') + 'gi.maintenance.mobility.report.json', report, {
            timeout: 55000
        }).success(function () {
            if (!report) {
                return;
            }
            report.syncInProgress = false;
            report.synced = true;
            Smartgeo.set_('reports', $scope.reports, function () {
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
            });
        }).error(function (data, code) {
            if (!report) {
                return;
            }
            if (Smartgeo.get('online') && code !== 0) {
                if (data.error) {
                    alertify.error(data.error.text);
                } else {
                    alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                }
            }
            report.syncInProgress = false;
        });
    };

    $scope.syncCensus = function (object, force) {
        if (object.synced && !force) {
            return false;
        }
        object.syncInProgress = true;
        $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.census.json'), object, {
            timeout: 55000
        }).success(function (data) {
            for(var okey in data){
                for (var i = 0; i < data[okey].length; i++) {
                    AssetFactory.save(data[okey][i],window.site);
                }
            }
            setTimeout(function() {
                for (var i in G3ME.map._layers) {
                    G3ME.map._layers[i].redraw && G3ME.map._layers[i].redraw();
                }
            }, 1000);


            if (!object) {
                return;
            }
            object.syncInProgress = false;
            object.synced = true;

            Smartgeo.set_('census', $scope.census, function () {
                $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
            });
        }).error(function (data, code) {
            if (!object) {
                return;
            }
            if (Smartgeo.get('online') && code !== 0) {
                if (data.error) {
                    alertify.error(data.error.text);
                } else {
                    alertify.error(i18n.get('_SYNC_UNKNOWN_ERROR_'));
                }
            }
            object.syncInProgress = false;
        });
    };

    $scope.__deleteCensus = function (census) {
        $scope.census.splice($scope.census.indexOf(census), 1);
        Smartgeo.set_('census', $scope.census, function () {
            $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
        });
    };

    $scope.__delete = function (report) {
        $scope.reports.splice($scope.reports.indexOf(report), 1);
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
