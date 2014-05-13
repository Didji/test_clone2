angular.module('smartgeomobile').factory('G3lic', ['$resource',
    function($resource) {
        return $resource('http://10.133.110.60:3000/licenses/:method', {}, {
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
        });
    }
]);
