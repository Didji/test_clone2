angular.module('smartgeomobile').controller('menuController', function ($scope, $routeParams, $window, $rootScope, Smartgeo, SQLite, i18n, $timeout) {

    'use strict';

    $rootScope.mlPushMenu = $rootScope.mlPushMenu || new mlPushMenu(document.getElementById('mp-menu'), document.getElementById('trigger'), {
        type: 'cover'
    });
    $(".mp-menu").css('width', Smartgeo._SIDE_MENU_WIDTH);

    $scope.version = Smartgeo._SMARTGEO_MOBILE_VERSION;

    function closest(e, classname) {
        if (classie.has(e, classname)) {
            return e;
        }
        return e.parentNode && closest(e.parentNode, classname);
    }

    window.closest = closest;

    $rootScope.backToPreviousLevel = $scope.backToPreviousLevel = function (event) {

        if (event && event.preventDefault) {
            event.preventDefault();
        }
        var openned = [];
        if (!event) {
            $('.mp-level').each(function (i) {
                if ($(this).hasClass('mp-level-open')) {
                    openned.push(i);
                }
            });
            if (!openned.length) {
                return;
            }
            event = {
                currentTarget: $($('.mp-level')[openned[openned.length - 1]]).find('.mp-back')[0]
            };
        }
        var level = closest(event.currentTarget, 'mp-level').getAttribute('data-level');
        if ($scope.mlPushMenu.level <= level) {
            if (event.stopPropagation) {
                event.stopPropagation();
            }
            $scope.mlPushMenu.level = closest(event.currentTarget, 'mp-level').getAttribute('data-level') - 1;
            if ($scope.mlPushMenu.level === 0) {
                $scope.mlPushMenu._resetMenu();
            } else {
                $scope.mlPushMenu._closeMenu();
            }
        }

        Smartgeo.set('persitence.menu.open.level', openned);
        return false;
    };


    $rootScope.closeLeftMenu = $scope.close = function (event) {
        if (event && event.preventDefault && $(event.target).attr('id') === "mp-pusher") {
            event.preventDefault();
            $scope.mlPushMenu._resetMenu();
            Smartgeo.set('persitence.menu.open', false);
        } else if (!event) {
            $scope.mlPushMenu._resetMenu();
            Smartgeo.set('persitence.menu.open', false);
        }
        return false;
    };

    $rootScope.openLeftMenu = $scope.open = function (event) {
        Smartgeo.set('persitence.menu.open', true);
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        if (Smartgeo.isRunningOnLittleScreen()) {
            $rootScope.$broadcast("CONSULTATION_CLOSE_PANEL");
        }

        $scope.mlPushMenu._openMenu();
        $scope.mlPushMenu.menuState = 'opened';
        return false;
    };

    $scope.toggle = function ($event) {
        if ($event && $event.preventDefault) {
            $event.preventDefault();
            $event.stopPropagation();
        }
        $scope[$scope.mlPushMenu.menuState === 'opened' ? 'close' : 'open']();
        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
        return false;
    };

    function updateSyncNumber(event) {
        var old = $scope.toSyncNumber ;
        Smartgeo.get_('reports', function (reports) {

            Smartgeo.get_('census', function (census) {
                var cpt =  0;
                census  = census  || [];
                reports = reports || [];
                for (var i = 0; i < reports.length; i++) {
                    if (!reports[i].synced) {
                        cpt++;
                    }
                }
                for (i = 0; i < census.length; i++) {
                    if (!census[i].synced) {
                        cpt++;
                    }
                }
                if(cpt !== 1*$scope.toSyncNumber){
                    $rootScope.syncCenterUpdateReportList();
                }
                $scope.toSyncNumber = cpt ;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        });
    }

    $scope.activateConsultation = function (event) {
        event.preventDefault();
        $rootScope.$broadcast("ACTIVATE_CONSULTATION");
        $scope.close();
        return false;
    };

    $scope.activatePosition = function (event) {
        event.preventDefault();
        $rootScope.$broadcast("ACTIVATE_POSITION");
        $scope.close();
        return false;
    };

    function restorePreviousState() {
        $timeout(function () {
            $scope[Smartgeo.get('persitence.menu.open') ? 'open' : 'close']();
        }, 10);
        var openLevels = Smartgeo.get('persitence.menu.open.level') ||  [];
        $('.mp-level').each(function (i) {
            if (openLevels.indexOf(i) !== -1) {
                $(this).addClass('mp-level-open');
            }
        });
    }

    restorePreviousState();
    $scope.$on('REPORT_LOCAL_NUMBER_CHANGE', updateSyncNumber);
    $scope.$on('_MENU_CLOSE_', $scope.close);

});
