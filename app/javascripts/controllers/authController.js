/**
 * @ngdoc object
 * @name smartgeomobile.authController
 * @description
 * Controlleur d'authentification.
 */
angular.module('smartgeomobile').controller('authController', function ($scope, $rootScope, $http, $location, $window, Smartgeo, SQLite, i18n, $route) {

    'use strict';

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#lastuser
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.lastuser = Smartgeo.get('user') || {
        "username"   :   "",
        "password"   :   "",
        "rememberme" : true
    };

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#version
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.version = Smartgeo.getVersion();

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#username
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.username = $scope.lastuser.username;

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#pwd
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.pwd = $scope.lastuser.password;

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#readyToLog
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.readyToLog = false;

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#gimapUrl
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.gimapUrl = Smartgeo._OVERRIDE_GIMAP_URL || Smartgeo.get('url') || "";

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#smallUrl
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.smallUrl = ($scope.gimapUrl || '').replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#rememberme
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.rememberme = $scope.lastuser.rememberme;

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#firstAuth
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.firstAuth = $scope.gimapUrl ? false : true ;

    /**
     * @ngdoc property
     * @name smartgeomobile.authController#logMessage
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.logMessage = '_AUTH_LOG_MESSAGE_INIT_';


    /**
     * @ngdoc method
     * @name smartgeomobile.authController#initialize
     * @propertyOf smartgeomobile.authController
     * @description
     */
    $scope.initialize = function () {

        $scope.$on("DEVICE_IS_ONLINE", $scope.ping);
        $scope.$on("DEVICE_IS_OFFLINE", $scope.ping);
        $scope.$on('$locationChangeStart', $scope.preventLocationChangeStart);

        Smartgeo.clearSiteSelection();
        Smartgeo.clearPersistence();
        Smartgeo.clearIntervals();
        Smartgeo.clearPollingRequest();

        if ($scope.gimapUrl) {
            $scope.ping();
        }
    };

    $scope.preventLocationChangeStart = function (event, next, current) {
        if (next.indexOf('/map/') !== -1) {
            event.preventDefault();
        }
    }

    $scope.ping = function () {
        $scope.readyToLog = false;
        $scope.logMessage = '_AUTH_LOG_MESSAGE_CHECK_';
        Smartgeo.ping($scope.isServerReachable);
    };

    $scope.loginFailed = function(response, status) {
        if (status === 403) {
            alertify.alert(i18n.get("_AUTH_INCORRECT_PASSWORD"));
        } else if (!status) {
            alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
        } else {
            alertify.alert(i18n.get("_AUTH_SERVER_ERROR", status));
        }
    };

    $scope.loginSucceed =  function () {
        var knownUsers = Smartgeo.get('knownUsers') || {};
        knownUsers[$scope.username] = $scope.pwd;
        Smartgeo.set('knownUsers', knownUsers);
        $scope.lastuser = {
            password: $scope.rememberme ? $scope.pwd : '',
            rememberme: $scope.rememberme
        };
        $scope.lastuser.username = $scope.username;
        Smartgeo.set('user', $scope.lastuser);
        $location.path('sites');
    };

    $scope.remoteLogin = function () {
        $scope.readyToLog = false;
        $scope.logMessage = "_AUTH_PLEASE_WAIT";
        Smartgeo.login(encodeURIComponent($scope.username), encodeURIComponent($scope.pwd),$scope.loginSucceed, $scope.loginFailed);
    };

    $scope.localLogin = function () {
        var knownUsers = Smartgeo.get('knownUsers') || {};
        if (knownUsers[$scope.username] === $scope.pwd) {
            $location.path('sites');
        } else {
            alertify.alert(i18n.get('_AUTH_INIT_WITHOUT_NETWORK_ERROR_', [$scope.username]));
        }
    };

    $scope.isServerReachable = function(yes){
        $scope.logMessage = '_AUTH_LOG_MESSAGE_' + (yes ? 'REMOTE' : 'LOCAL') + '_';
        $scope.readyToLog = true;
        if (!yes) {
            alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
        }
    };

    $scope.formSubmit = function(){
        if($scope.firstAuth){
            $scope.initializeGimap();
        } else {
            $scope.login();
        }
    };

    $scope.initializeGimap = function() {
        if(!$scope.gimapUrl.length || !$scope.username.trim().length || !$scope.pwd.trim().length){
            return alertify.alert(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
        }
        $scope.gimapUrl  = Smartgeo.setGimapUrl($scope.gimapUrl);
        Smartgeo.ping(function(yes){
            if(yes){
                $scope.login();
            } else {
                alertify.alert(i18n.get("_AUTH_SERVER_UNREACHABLE"));
            }
        });
    }

    $scope.login = function () {
        $scope.username  = $scope.username.trim();
        $scope.pwd       = $scope.pwd.trim();
        if (!$scope.username.length || !$scope.pwd.length) {
            return alertify.alert(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
        }
        $scope[Smartgeo.get('online') === true ? "remoteLogin" : "localLogin"]();
    };

    $scope.resetForm = function () {
        Smartgeo.reset();
        document.location.reload();
    };

    $scope.forgetPassword = function () {
        $scope.username = $scope.pwd = '';
        Smartgeo.unset('user');
    };

});
