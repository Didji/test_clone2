// http://www.yearofmoo.com/2013/01/full-spectrum-testing-with-angularjs-and-karma.html

'use strict';

describe('Smartgeomobile controllers', function() {

  describe('AuthController', function(){

    beforeEach(module('smartgeomobile'));

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
});  