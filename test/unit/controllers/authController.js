describe('Smartgeomobile controllers', function() {
    'use strict';

    var $scope, ctrl;

    beforeEach(module('smartgeomobile'));
    beforeEach(inject(function($rootScope) {
        $scope = $rootScope.$new();
    }));

    describe('AuthController', function(){

        // beforeEach(inject(function($controller) {
        // }));

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
                ctrl = $controller('authController', {$scope:$scope});
                spyOn($scope, "initialize").andCallThrough();
                spyOn($scope, "ping").andCallThrough();
                Smartgeo._OVERRIDE_GIMAP_URL = "http://beta.smartgeo.fr/index.php?service=";
                $scope.initialize();
                expect($scope.ping).toHaveBeenCalled();
            }));


            it('should prevent url change on locationChangeStart', inject(function(Smartgeo, $controller, $location) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.initialize();
                $location.path('/#');
                // $location.path('/map'); // MAKE THIS WORK
                $scope.$broadcast('$locationChangeStart', "/map/");
                expect($location.path()).toEqual('/#');
            }));


        });

        describe('AuthController#setGimapUrl', function(){


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

        describe('AuthController#forgetPassword', function(){
            it('should call ping method if gimapUrl is setted', inject(function(Smartgeo, $controller) {
                ctrl = $controller('authController', {$scope:$scope});
                $scope.forgetPassword();
                expect($scope.pwd).toEqual('');
                expect(Smartgeo.get('user')).toEqual(undefined);
            }));
        });

        describe('AuthController#initialize#android', function($controller){


            it('should instanciate window.ChromiumCallbacks if its not', inject(function(Smartgeo,$controller) {
                ctrl = $controller('authController', {$scope:$scope});
                window.SmartgeoChromium = {
                    getExtApplicationDirectory : angular.noop
                } ;
                window.ChromiumCallbacks = undefined ;
                $scope.initialize();
                expect(window.ChromiumCallbacks).not.toBe(null);
            }));

            it('should set tileRootPath', inject(function(Smartgeo,$controller) {
                ctrl = $controller('authController', {$scope:$scope});

                window.SmartgeoChromium = {
                    getExtApplicationDirectory : angular.noop
                } ;
                window.ChromiumCallbacks = undefined ;
                $scope.initialize();

                var fakeRootPath = '/fake/root/path' ;
                window.ChromiumCallbacks[13](fakeRootPath);
                expect(Smartgeo.get('tileRootPath')).toEqual(fakeRootPath)
            }));



        });
    });
});
