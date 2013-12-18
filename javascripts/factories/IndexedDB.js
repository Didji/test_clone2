
    var IndexedDB = {

        name : 'smartgeo',

        version : 1,

        database : null,

        open : function(callback){

            try {

                if(IndexedDB.database){
                    return callback();
                }

                var request = window.indexedDB.open(IndexedDB.name);

                request.onsuccess = function (event) {
                    IndexedDB.database = event.target.result;
                    IndexedDB.database.version = IndexedDB.version;
                    callback();
                };

                request.onerror = function (event) {
                    console.error(event.message);
                };

                request.onupgradeneeded = function(event) {
                    IndexedDB.database = event.target.result;
                    if(IndexedDB.database.objectStoreNames.contains("parameters")) {
                        IndexedDB.database.deleteObjectStore("parameters");
                    }
                    var store = IndexedDB.database.createObjectStore("parameters",  { keyPath: "key" });
                };

            } catch (e) {
                console.error(e.message);
            }

        },

        close : function(){
            IndexedDB.database.close();
        },

        get: function(parameter, callback){
            this.open(function(){
                var transaction = IndexedDB.database.transaction(["parameters"]),
                    objectStore = transaction.objectStore("parameters"),
                    getter      = objectStore.get(parameter);
                getter.onsuccess = function(e) {
                    var result = e.target.result;
                    (callback||function(){})(result ? result.value : null);
                };
                getter.onerror = function(e){
                    console.error(e);
                };
            });
        },

        set: function(parameter, value, success, error){
            this.open(function(){
                var transaction = IndexedDB.database.transaction(["parameters"], "readwrite"),
                    objectStore = transaction.objectStore("parameters"),
                    request     ;
                try{
                    request = objectStore.delete(parameter);
                    request = objectStore.put({key:parameter, value:value});
                } catch(e){
                    console.log(e);
                }
                transaction.onsuccess =  (success || function(){});
                transaction.onerror   =  (error   || function(){});
            });
        },

        unset: function(parameters, callback){
            this.open(function(){
                var request = IndexedDB.database.transaction(["parameters"], "readwrite")
                                .objectStore("parameters")
                                .delete(parameters);
                request.onsuccess = function(event) {
                    (callback||function(){})();
                };
            });
        }

    };
    window.indexedDB      = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange    = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;


window.smartgeoPersistenceIndexedDB = IndexedDB ;

smartgeomobile.factory('IndexedDB', function(){
    'use strict' ;
    return IndexedDB ;
});
