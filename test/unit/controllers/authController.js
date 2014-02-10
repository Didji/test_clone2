describe('Smartgeomobile controllers', function() {
    'use strict';

    var $scope, ctrl;

    beforeEach(module('smartgeomobile'));
    beforeEach(inject(function($rootScope) {
        $scope = $rootScope.$new();
    }));

    describe('AuthController', function(){

       describe('AuthController#initialize', function(){

            it('should instanciate $scope values', inject(function($controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.initialize();
                expect($scope.logMessage).not.toBe(undefined);
                expect($scope.lastuser).not.toBe(undefined);
                expect($scope.version).not.toBe(undefined);
                expect($scope.username).not.toBe(undefined);
                expect($scope.pwd).not.toBe(undefined);
                expect($scope.readyToLog).not.toBe(undefined);
                expect($scope.firstAuth).not.toBe(undefined);
                expect($scope.gimapUrl).not.toBe(undefined);
                expect($scope.smallUrl).not.toBe(undefined);
                expect($scope.rememberme).not.toBe(undefined);
            }));

            it('should display init message on first login', inject(function($controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.gimapUrl = undefined ;
                Smartgeo._OVERRIDE_GIMAP_URL = undefined ;
                Smartgeo.unset('url');
                $scope.initialize();
                expect($scope.firstAuth).toBe(true);
                expect($scope.logMessage).toBe('_AUTH_LOG_MESSAGE_INIT_');
            }));

            it('should clear intervals', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.initialize();
                expect(Object.keys(Smartgeo._intervals).length).toBe(0);
            }));

            it('should clear persistence', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.initialize();
                expect(Smartgeo.get('lastLeafletMapExtent')).toBe(null);
                expect(Smartgeo.get('persitence.menu.open')).toBe(null);
                expect(Smartgeo.get('persitence.menu.open.level')).toBe(null);

                var missions = Smartgeo.get('missions');
                for(var i in missions){
                    expect(missions[i].openned).toBe(false);
                }

            }));

            it('should call ping method if gimapUrl is setted', inject(function(Smartgeo, $controller) {
                Smartgeo._OVERRIDE_GIMAP_URL = "http://beta.smartgeo.fr/index.php?service=";
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "initialize").andCallThrough();
                spyOn($scope, "ping").andCallThrough();
                $scope.initialize();
                expect($scope.ping).toHaveBeenCalled();
            }));

        });

        describe('AuthController#login', function(){
            it('should set gimapUrl and ping server if firstLogin', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "ping").andCallThrough();
                $scope.firstAuth = true ;
                $scope.gimapUrl  = "http://beta.smartgeo.fr";
                $scope.login();
                expect(Smartgeo.get('url')).toEqual($scope.gimapUrl);
                expect($scope.ping).toHaveBeenCalled();
            }));

            it('should trim user and password', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.username = "  mockUsername ";
                $scope.pwd = "  mockPwd ";
                $scope.login();
                expect($scope.username).toEqual("mockUsername");
                expect($scope.pwd).toEqual("mockPwd");
            }));

            it('should alert if no username or password are provided', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.username = "mockUsername";
                $scope.pwd = "";
                $scope.login();
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
            }));

            it('should call remoteLogin if online', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                Smartgeo.set('online', true) ;
                $scope.username = "  mockUsername ";
                $scope.pwd = "  mockPwd ";
                spyOn($scope, "remoteLogin").andCallThrough();
                $scope.login();
                expect($scope.remoteLogin).toHaveBeenCalled();
            }));

            it('should call localLogin if offline', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                Smartgeo.set('online', false) ;
                $scope.username = "  mockUsername ";
                $scope.pwd = "  mockPwd ";
                spyOn($scope, "localLogin").andCallThrough();
                $scope.login();
                expect($scope.localLogin).toHaveBeenCalled();
            }));


        });


        describe('AuthController#localLogin', function(){
            it('should redirect to #/site/ if credentials are good', inject(function(Smartgeo, $controller, $location) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($location, "path").andCallThrough();
                $scope.username = "mockUser" ;
                $scope.pwd      = "mockSavedPassword" ;
                var mockKnownUsers = {};
                mockKnownUsers[$scope.username] = $scope.pwd ;
                Smartgeo.set('knownUsers', mockKnownUsers);
                $scope.localLogin();
                expect($location.path).toHaveBeenCalledWith('sites')
            }));
        });

        describe('AuthController#remoteLogin', function(){
            it('should change log button message', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.remoteLogin();
                expect($scope.logMessage).toEqual("_AUTH_PLEASE_WAIT")
            }));
        });

        describe('AuthController#isServerReachable', function(){
            it('should alert if error', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.isServerReachable(false);
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_SERVER_UNREACHABLE"));
                expect($scope.logMessage).toEqual('_AUTH_LOG_MESSAGE_LOCAL_')
            }));

            it('should let user to log if yes', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.isServerReachable(true);
                expect(alertify.alert).not.toHaveBeenCalledWith(i18n.get("_AUTH_SERVER_UNREACHABLE"));
                expect($scope.logMessage).toEqual('_AUTH_LOG_MESSAGE_REMOTE_')
            }));
        });

        describe('AuthController#loginSucceed', function(){

            it('should update known user password', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.username = "mockUser" ;
                $scope.pwd      = "mockSavedPassword" ;
                var mockKnownUsers = {};
                mockKnownUsers[$scope.username] = $scope.pwd ;
                Smartgeo.set('knownUsers', mockKnownUsers);
                $scope.pwd = "mockSavedPassword2" ;
                $scope.loginSucceed();
                expect(Smartgeo.get('knownUsers')[$scope.username]).toEqual($scope.pwd);
            }));

            it('should work even if no user are know', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                Smartgeo.unset('knownUsers');
                $scope.username = "mockUser" ;
                $scope.pwd      = "mockSavedPassword" ;
                $scope.loginSucceed();
                expect(Smartgeo.get('knownUsers')[$scope.username]).toEqual($scope.pwd);
            }));

            it('should not remember last user if rememberme flag is set to false', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                Smartgeo.unset('knownUsers');
                $scope.username = "mockUser" ;
                $scope.pwd      = "mockSavedPassword" ;
                $scope.rememberme = false ;
                $scope.loginSucceed();
                expect(Smartgeo.get('user').password).toEqual('');
            }));

            it('should remember last user if rememberme flag is set to true', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.username = "mockUser" ;
                $scope.pwd      = "mockSavedPassword" ;
                $scope.rememberme = true;
                $scope.loginSucceed();
                expect(Smartgeo.get('user').username).toEqual($scope.username);
                expect(Smartgeo.get('user').password).toEqual($scope.pwd);
            }));

            it('should redirect to #/sites/', inject(function(Smartgeo, $controller, i18n, $location) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($location, "path").andCallThrough();
                $scope.loginSucceed();
                expect($location.path).toHaveBeenCalledWith('sites')
            }));

        });

        describe('AuthController#loginFailed', function(){
            it('should alert if error', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.loginFailed(undefined, 403);
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_INCORRECT_PASSWORD"));
                $scope.loginFailed(undefined, undefined);
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_SERVER_UNREACHABLE"));
                $scope.loginFailed(undefined, 500);
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_SERVER_ERROR", 500));

            }));
        });

        describe('AuthController#preventLocationChangeStart', function(){


            it('should reset values', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.setGimapUrl();
                expect($scope.firstAuth).toBe(true);
                expect($scope.gimapUrl).toBe(null);
                expect($scope.username).toEqual('');
                expect($scope.pwd).toEqual('');
                expect($scope.logMessage).toEqual('_AUTH_LOG_MESSAGE_INIT_');
            }));
        });

        describe('AuthController#setGimapUrl', function(){
            it('should prevent url change on locationChangeStart when backing to map', inject(function(Smartgeo, $controller, $location) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.initialize();
                var mockEvent = document.createEvent('CustomEvent');
                mockEvent.initCustomEvent('$locationChangeStart', false, false, null);
                var next = "/map/" ;
                spyOn(mockEvent, "preventDefault").andCallThrough();
                $scope.preventLocationChangeStart(mockEvent, next);
                expect(mockEvent.preventDefault).toHaveBeenCalled();
            }));

            it('should not prevent url change on locationChangeStart when backing to site', inject(function(Smartgeo, $controller, $location) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.initialize();
                var mockEvent = document.createEvent('CustomEvent');
                mockEvent.initCustomEvent('$locationChangeStart', false, false, null);
                var next = "/site/" ;
                spyOn(mockEvent, "preventDefault").andCallThrough();
                $scope.preventLocationChangeStart(mockEvent, next);
                expect(mockEvent.preventDefault).not.toHaveBeenCalled();
            }));
        });


        describe('AuthController#forgetPassword', function(){
            it('should call ping method if gimapUrl is setted', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.forgetPassword();
                expect($scope.pwd).toEqual('');
                expect(Smartgeo.get('user')).toEqual(undefined);
            }));
        });

        describe('AuthController#initialize#android', function($controller){

            it('should set tileRootPath', inject(function(Smartgeo,$controller) {
                ctrl = $controller('authController', {$scope:$scope});
                window.SmartgeoChromium  = { getExtApplicationDirectory : angular.noop};
                spyOn(window.SmartgeoChromium, "getExtApplicationDirectory").andCallThrough();
                $scope.initialize();
                var fakeRootPath = '/fake/root/path' ;
                window.ChromiumCallbacks[13](fakeRootPath);
                expect(Smartgeo.get('tileRootPath')).toEqual(fakeRootPath)
                expect(window.SmartgeoChromium.getExtApplicationDirectory).toHaveBeenCalled();
            }));

        });
    });
});
