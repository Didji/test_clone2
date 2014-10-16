angular.module('smartgeomobile').factory('G3lic', ['$resource',
    function ($resource) {
        return $resource('http://localhost:3000/licenses/:method', {}, {
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