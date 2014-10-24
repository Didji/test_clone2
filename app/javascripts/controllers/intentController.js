(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .controller('IntentController', IntentController);

    IntentController.$inject = ["$scope", "$routeParams", "$location", "$rootScope", "Smartgeo", "$http", "$window", "G3ME", "i18n", "Icon", "Storage", "Site"];

    /**
     * @class IntentController
     * @desc Controlleur du menu de gestion des intents
     */
    function IntentController($scope, $routeParams, $location, $rootScope, Smartgeo, $http, $window, G3ME, i18n, Icon, Storage, Site) {

        var vm = this;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            vm.controller = $routeParams.controller;

            if (vm.controller === "oauth") {
                if (!Storage.get("url") || Storage.get("url").indexOf($routeParams.url) === -1) {
                    Smartgeo.setGimapUrl($routeParams.url);
                }
                return tokenAuth($routeParams.token, function () {
                    $location.path('sites/');
                });
            }

            if (!vm.controller) {
                return false;
            }

            if ($routeParams.site) {
                Site.current = Site.current || Storage.get_('sites')[$routeParams.site];
            } else {
                var sites = Storage.get_('sites');
                for (var siteId in sites) {
                    if (sites.hasOwnProperty(siteId)) {
                        Site.current = sites[siteId];
                        break;
                    }
                }
            }

            if (!Site.current) {
                alertify.alert(i18n.get("_INTENT_ZERO_SITE_SELECTED"));
                $location.path("#");
                return false;
            }

            for (var arg in $routeParams) {
                if ($routeParams.hasOwnProperty(arg) && arg !== "controller" && arg !== "token") {
                    $rootScope[arg] = $routeParams[arg];
                }
            }

            if ($rootScope.map_target) {
                // TODO: OULALA IT'S UGLY /!\ REFACTOR ALERT /!\
                G3ME.parseTarget(Site.current, $rootScope.map_target, function (assets) {
                    if (!assets.length) {
                        alertify.alert(i18n.get("_INTENT_OBJECT_NOT_FOUND"));
                        return tokenAuth($routeParams.token, redirect);
                    }
                    $rootScope.map_target = assets;
                    if ($rootScope.map_marker === 'true' || $rootScope.map_marker === true) {
                        $rootScope.map_marker = L.marker($rootScope.map_target, {
                            icon: Icon.get('CONSULTATION')
                        });
                        if ($rootScope.report_target && $rootScope.report_activity) {
                            $rootScope.map_marker.on('click', function () {
                                $location.path('/report/' + Site.current.id + "/" + $rootScope.report_activity + "/" + $rootScope.report_target);
                                $scope.$apply();
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            });
                        }
                    } else {
                        $rootScope.map_marker = undefined;
                    }
                    tokenAuth($routeParams.token, redirect);
                }, function () {
                    alertify.alert(i18n.get("_INTENT_TARGET_NOT_VALID", $rootScope.map_target));
                    $location.path('/map/');

                });
            } else {
                tokenAuth($routeParams.token, redirect);
            }
        }

        /**
         * @name tokenAuth
         * @desc Fonction d'authentification par token
         */
        function tokenAuth(token, callback) {
            var currentUser = (Storage.get('users') || {})[Storage.get('lastUser')] || {};
            currentUser.token = token;
            Storage.set('user', currentUser);

            Smartgeo.login(token, callback, function (response) {
                if ((response && response.status === 200) || !response) {
                    callback();
                } else {
                    alertify.alert(i18n.get("_INTENT_AUTH_FAILED", status));
                    $location.path('/');
                }
            });
        }

        /**
         * @name redirect
         * @desc Fonction de redirection
         */
        function redirect() {
            switch ($scope.controller) {
            case 'map':
                $location.path('map/' + Site.current.id);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                break;

            case 'report':
                $location.path('report/' + Site.current.id + '/' + $rootScope.report_activity + '/' + $rootScope.target + '/');
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                break;
            }
        }



    }

})();
