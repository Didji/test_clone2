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

    });

    describe('IntentController', function(){

        var $scope;

        beforeEach(inject(function ($rootScope, $controller) {
            $scope = $rootScope.$new();
            $rootScope.site = {id:'Smartgeo'};
        }));

        it('should set correctly $rootScope vars for target=xy & marker=true & mission & prefill(label) & redirect+callback(label)', inject(function($controller, $rootScope) {

            $controller('intentController', { $scope: $scope, $rootScope:$rootScope, $routeParams : {
                    report_url_redirect:    'http://google.fr/?[LABEL_INDEXED_FIELDS]',
                    report_mission:         '12772',
                    report_activity:        '3',
                    report_target:          '45.526944,4.260833',
                    report_fields:          'fields[Intervenant]=GLO%20GLO',
                    map_target:             '45.526944,4.260833',
                    map_activity:           '3',
                    map_marker:             'true',
                    controller:             'map'
            }});

            expect($rootScope.report_url_redirect ).toEqual('http://google.fr/?[LABEL_INDEXED_FIELDS]');
            expect($rootScope.report_mission      ).toEqual('12772');
            expect($rootScope.report_activity     ).toEqual('3');
            expect($rootScope.report_target       ).toEqual('45.526944,4.260833');
            expect($rootScope.report_fields       ).toEqual('fields[Intervenant]=GLO%20GLO');

            expect($rootScope.map_target          ).toEqual(['45.526944','4.260833']);
            expect($rootScope.map_activity        ).toEqual('3');
            expect($rootScope.map_marker          ).toEqual(jasmine.any(Object));

            expect($scope.controller              ).toEqual('map');

        }));

        it('should set correctly $rootScope vars for target=asset & marker=true & mission & prefill(label) & redirect+callback(label)', inject(function($controller, $rootScope) {

            $controller('intentController', { $scope: $scope, $rootScope:$rootScope, $routeParams : {
                    report_url_redirect:    'http://google.fr/?[LABEL_INDEXED_FIELDS]',
                    report_mission:         '12772',
                    report_activity:        '3',
                    report_target:          '172227',
                    report_fields:          'fields[Intervenant]=GLO%20GLO',
                    map_target:             '172227',
                    map_activity:           '3',
                    map_marker:             'false',
                    controller:             'map'
            }});

            expect($rootScope.report_url_redirect ).toEqual('http://google.fr/?[LABEL_INDEXED_FIELDS]');
            expect($rootScope.report_mission      ).toEqual('12772');
            expect($rootScope.report_activity     ).toEqual('3');
            expect($rootScope.report_target       ).toEqual('172227');
            expect($rootScope.report_fields       ).toEqual('fields[Intervenant]=GLO%20GLO');

            expect($rootScope.map_target          ).toEqual('172227');
            expect($rootScope.map_activity        ).toEqual('3');
            expect($rootScope.map_marker          ).toEqual('false');

            expect($scope.controller              ).toEqual('map');

        }));
    });
});
