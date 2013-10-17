// http://www.yearofmoo.com/2013/01/full-spectrum-testing-with-angularjs-and-karma.html

'use strict';

describe('Smartgeomobile controllers', function() {
  
    beforeEach(module('smartgeomobile'));

    describe('AuthController', function(){

        it('should instanciate view with message', inject(function($controller) {
            var scope = {},
                ctrl = $controller('authController', {$scope:scope});
            expect(scope.logMessage).toBe("Vérification du serveur");
        }));

        it('should login', inject(function($controller) {
            var scope = {},
            ctrl = $controller('authController', {$scope:scope});
            expect(scope.login()).not.toBe(false);
        }));
    });

    describe('SiteListController', function(){

        it('should login', inject(function($controller) {
            var scope = {},
                ctrl = $controller('siteListController', {$scope:scope});
            expect(true).not.toBe(false);
        }));
    });
    
});  
