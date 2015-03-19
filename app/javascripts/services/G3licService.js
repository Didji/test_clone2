angular.module( 'smartgeomobile' ).factory( 'G3lic', ['$resource', function($resource) {

        "use strict";

        return $resource( 'http://10.133.110.30:8081/licenses/:method', {}, {
            register: {
                method: 'POST',
                params: {
                    method: "register"
                },
                isArray: true
            },
            check: {
                method: 'POST',
                params: {
                    method: "check"
                },
                isArray: true
            }
        } );
    }
] );
