angular.module('smartgeomobile').factory('CordovaReady', [
  '$q',
    function($q, $rootScope) {
        return function(scope) {
            scope = scope || $rootScope;
            var deferred = $q.defer();

            if ( navigator.userAgent.match(/Android/i) ||
                 navigator.userAgent.match(/iPhone/i)  ||
                 navigator.userAgent.match(/iPad/i) ) {
                document.addEventListener('deviceready', function() {
                    if(scope){
                        scope.$apply(function(){
                            deferred.resolve();
                        });
                    }else{
                        deferred.resolve();
                    }
                }, false);
            } else {
                 if(scope){
                    scope.$apply(function(){
                        deferred.resolve();
                    });
                }else{
                    deferred.resolve();
                }
            }

            return deferred.promise;
        };
    }]);
