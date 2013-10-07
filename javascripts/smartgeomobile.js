angular.module('smartgeomobile', ['ngRoute','ui.select2'])
       .config(['$routeProvider', function($routeProvider) {
            $routeProvider.
                when('/',                                       {templateUrl: 'partials/login.html'}).
                when('/sites/',                                 {templateUrl: 'partials/sites.html'}).

                when('/report/:site',                           {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity',                 {templateUrl: 'partials/report.html'}).
                when('/report/:site/:activity/:assets',         {templateUrl: 'partials/report.html'}).

                when('/sites/install/:site',                    {templateUrl: 'partials/installation.html'}).
                when('/map/:site',                              {templateUrl: 'partials/map.html'}).
                otherwise({redirectTo: '/'});
    }]).config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.withCredentials = true;
        $httpProvider.defaults.useXDomain = true;
    }]);
