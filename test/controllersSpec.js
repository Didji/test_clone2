// http://www.yearofmoo.com/2013/01/full-spectrum-testing-with-angularjs-and-karma.html

'use strict';

describe('Smartgeomobile controllers', function() {
// var $rootScope, $location;
    beforeEach(module('smartgeomobile'));
//   beforeEach(inject(function($injector) {
//     $rootScope = $injector.get('$rootScope');
//     $location = $injector.get('$location');
//   }));

    // describe('AuthController', function(){

    //     it('should instanciate view with message', inject(function($controller) {
    //         var scope = {},
    //             ctrl = $controller('authController', {$scope:scope});
    //         expect(scope.logMessage).toBe("Vérification du serveur");
    //     }));

    //     it('should login', inject(function($controller) {
    //         var scope = {},
    //         ctrl = $controller('authController', {$scope:scope});
    //         expect(scope.login()).not.toBe(false);
    //     }));
    // });

    // describe('SiteListController', function(){

    //     it('should login', inject(function($controller) {
    //         var scope = {},
    //             ctrl = $controller('siteListController', {$scope:scope});
    //         expect(true).not.toBe(false);
    //     }));
    // });

    describe('IntentController', function(){

        var scope,
            ctrl,
            rootScope ;

        beforeEach(inject(function ($rootScope, $controller) {
            rootScope = $rootScope.$new();
            spyOn(rootScope, '$on');
            rootScope.site = {id:'Smartgeo'};
            rootScope.$on('$routeChangeStart', function(scope, next, current){
                console.log('Changing from '+angular.toJson(current)+' to '+angular.toJson(next));
            });

            ctrl = $controller('intentController', { $scope: scope, $rootScope:rootScope, $routeParams : {
                    report_url_redirect: 'http://google.fr/?[LABEL_INDEXED_FIELDS]',
                    report_mission:12772,
                    report_activity:3,
                    report_target:'45.526944,4.260833',
                    report_fields:'fields[Intervenant]=GLO%20GLO',
                    map_target:'45.526944,4.260833',
                    map_activity:3,
                    map_marker:true
            }});

        }));


        it('should set $rootScope vars', inject(function($controller, $rootScope) {
                expect(rootScope.report_url_redirect ).toEqual('http://google.fr/?[LABEL_INDEXED_FIELDS]');
                expect(rootScope.report_mission      ).toEqual(12772);
                expect(rootScope.report_activity     ).toEqual(3);
                expect(rootScope.report_target       ).toEqual('45.526944,4.260833');
                expect(rootScope.report_fields       ).toEqual('fields[Intervenant]=GLO%20GLO');
                expect(rootScope.map_target          ).toEqual(['45.526944','4.260833']);
                expect(rootScope.map_activity        ).toEqual(3);
                expect(typeof rootScope.map_marker   ).toEqual('object');
        }));
    });
});
