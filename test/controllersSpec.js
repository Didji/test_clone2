// http://www.yearofmoo.com/2013/01/full-spectrum-testing-with-angularjs-and-karma.html
/*global beforeEach, module, describe,  window, angular, navigator, SmartgeoChromium, document, console, Camera, $  */


describe('Smartgeomobile controllers', function() {
    'use strict';

    var $scope, ctrl;

    beforeEach(module('smartgeomobile'));
    beforeEach(inject(function($rootScope) {
        $scope = $rootScope.$new();
    }));

    describe('AuthController', function(){

        beforeEach(inject(function($controller) {
            ctrl = $controller('authController', {$scope:$scope});
            $scope.initialize();
        }));

        describe('AuthController#initialize', function(){

            it('should instanciate $scope values', inject(function() {

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

            it('should clear intervals', inject(function(Smartgeo) {
                expect(Object.keys(Smartgeo._intervals).length).toBe(0);
            }));

            it('should clear persistence', inject(function(Smartgeo) {

                expect(Smartgeo.get('lastLeafletMapExtent')).toBe(null);
                expect(Smartgeo.get('persitence.menu.open')).toBe(null);
                expect(Smartgeo.get('persitence.menu.open.level')).toBe(null);

                var missions = Smartgeo.get('missions');
                for(var i in missions){
                    expect(missions[i].openned).toBe(false);
                }

            }));
        });

        describe('AuthController#ping', function(){

            it('call function back with true or false', inject(function() {
                $scope.gimapUrl = 'http://beta.smartgeo.fr/index.php&service=';

                var callback = jasmine.createSpy();
                $scope.ping(callback);

                waitsFor(function() {
                    return callback.callCount > 0;
                }, "$scope.ping", 10000);

                runs(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback).toHaveBeenCalledWith(jasmine.any(Boolean));
                });


            }));

        });


    });

});
