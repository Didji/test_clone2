angular.module('smartgeomobile').factory('Intents', function($rootScope){

    var Intents = {

        registeredParameters: [],

        setParams : function(args){
            for (var i = 0; i < args.length; i++) {
                registeredParameters.push(args[i]);
                Intents.set(args[i].parameter, args[i].value) ;
            }
        },

        set: function(parameter, value){
            Intents.registeredParameters.push(parameter);
            $rootScope[parameter] = value ;
            Smartgeo.set('intent-'+parameter, value);
        },

        get: function(parameter){
            return $rootScope[parameter] ;
            return Smartgeo.get('intent-'+parameter);
        },

        unset: function(parameter){
            Smartgeo.unset('intent-'+parameter);
        },

        reset: function(){
            for (var i = 0; i < Intents.registeredParameters.length; i++) {
                Intents.unset(Intents.registeredParameters[i]);
            }
            Intents.registeredParameters = [];
            return this ;
        },

        loadRegisteredParameters: function(){
            Intents.registeredParameters = Intents.get('registeredParameters');
            for (var i = 0; i < Intents.registeredParameters.length; i++) {
                Intents.set(Intents.registeredParameters[i], Intents.get(Intents.registeredParameters[i]));
            }
            return this;
        }

    }

    Intents.loadRegisteredParameters.().reset();

    return Intents ;

});
