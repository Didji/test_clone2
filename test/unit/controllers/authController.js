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
                spyOn($scope, "ping").andCallThrough();
                $scope.initialize();
                expect($scope.ping).toHaveBeenCalled();
            }));

            it('should not call ping method if gimapUrl is not setted', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "ping").andCallThrough();
                $scope.gimapUrl = '';
                $scope.initialize();
                expect($scope.ping).not.toHaveBeenCalled();
            }));

        });

        describe('AuthController#login', function(){

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

        describe('AuthController#pingCallback', function(){
            it('should alert if error', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.pingCallback(false);
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_SERVER_UNREACHABLE"));
                expect($scope.logMessage).toEqual('_AUTH_LOG_MESSAGE_LOCAL_')
            }));

            it('should let user to log if yes', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.pingCallback(true);
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

        describe('AuthController#formSubmit', function(){
            it('should call initializeGimap if first auth', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "initializeGimap").andCallThrough();
                $scope.firstAuth = true ;
                $scope.formSubmit();
                expect($scope.initializeGimap).toHaveBeenCalled();

            }));
            it('should call login if not first auth', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "login").andCallThrough();
                $scope.firstAuth = false ;
                $scope.formSubmit();
                expect($scope.login).toHaveBeenCalled();
            }));
        });

        describe('AuthController#resetForm', function(){
            it('should reset application', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(Smartgeo, "reset").andCallThrough();
                $scope.resetForm();
                expect(Smartgeo.reset).toHaveBeenCalled();
            }));
        });

        describe('AuthController#initializeGimap', function(){
            it('should alert if required $scope.username is empty', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.gimapUrl = "MockUrl" ;
                $scope.username = "" ;
                $scope.pwd      = "MockPwd" ;
                $scope.initializeGimap();
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
            }));
            it('should alert if required $scope.gimapUrl is empty', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.gimapUrl = "" ;
                $scope.username = "MockUser" ;
                $scope.pwd      = "MockPwd" ;
                $scope.initializeGimap();
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
            }));
            it('should alert if required $scope.pwd is empty', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.gimapUrl = "MockUrl" ;
                $scope.username = "MockUser" ;
                $scope.pwd      = "" ;
                $scope.initializeGimap();
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_REQUIRED_FIELD_EMPTY"));
            }));
            it('should not alert if all required fields are not empty', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.gimapUrl = "MockUrl" ;
                $scope.username = "MockUser" ;
                $scope.pwd      = "MockPwd" ;
                $scope.initializeGimap();
                expect(alertify.alert).not.toHaveBeenCalled();
            }));
        });

        describe('AuthController#initializeGimapPingCallback', function(){
            it('should login if server is reachable', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "login").andCallThrough();
                $scope.initializeGimapPingCallback(true);
                expect($scope.login).toHaveBeenCalled();
            }));
            it('should alert if server is not reachable', inject(function(Smartgeo, $controller, i18n) {
                ctrl = $controller('authController', {$scope:$scope});
                spyOn(alertify, "alert").andCallThrough();
                $scope.initializeGimapPingCallback(false);
                expect(alertify.alert).toHaveBeenCalledWith(i18n.get("_AUTH_SERVER_UNREACHABLE"));
            }));
        });
    });
});
