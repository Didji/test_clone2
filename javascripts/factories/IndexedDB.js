angular.module('smartgeomobile').factory('IndexedDB', function(){

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
                    // store.createIndex("parameter", "parameter", { unique: true });
                };

            } catch (e) {
                console.error(e.message);
            }

        },

        close : function(){
            IndexedDB.database.close();
        },

        get: function(parameter, callback){
            console.warn(parameter);
            this.open(function(){
                var value = null;
                var transaction = IndexedDB.database.transaction(["parameters"]);
                var objectStore = transaction.objectStore("parameters");
                var getter = objectStore.get(parameter);
                getter.onsuccess = function(e) {
                    var match = e.target.result;
                    value = match ? match.value : null;
                    console.log(value);
                    (callback||function(){})(value);
                };
                getter.onerror = function(e){
                    console.error(e);
                };
            });
        },

        set: function(parameter, value, success, error){
            console.warn(parameter);
            this.open(function(){
                var transaction = IndexedDB.database.transaction(["parameters"], "readwrite");
                transaction.oncomplete = (success || function(){})();
                transaction.onerror    = (error   || function(){})();
                var objectStore = transaction.objectStore("parameters");
                var request = objectStore.add({key:parameter, value:value});
                request.onsuccess = function(event) {
                    console.log("set success pour "+parameter+"/"+value);
                };
                request.onerror = function(event) {
                    console.error("set error pour "+parameter+"/"+value);
                };
            });
        },

        unset: function(parameters){
            console.warn(parameter);
            this.open(function(){
                var request = IndexedDB.database.transaction(["parameters"], "readwrite")
                                .objectStore("parameters")
                                .delete(parameters);
                request.onsuccess = function(event) {
                    (callback||function(){})();
                };
            });
        }

        // getAssets : function(extent){
        //     if(!IndexedDB.database){
        //         return IndexedDB.open(function(){
        //             IndexedDB.getAssets(extent);
        //         });
        //     }

        //     // var range = IDBKeyRange.only("172525");
        //     // var range = IDBKeyRange.bound([extent.xmin,extent.ymin],[extent.xmax,extent.ymax]);
        //     var range = IDBKeyRange.upperBound([extent.xmin,extent.xmax,extent.ymin,extent.ymax]);
        //     var transaction = IndexedDB.database.transaction(['assets'], "readwrite");
        //     var store = transaction.objectStore("assets");
        //     // var test =  store.get(172525);
        //     var index = store.index("bounds");
        //     var test = index.openCursor(range);
        //         test.onsuccess = function(e) {
        //         var match = e.target.result;
        //             if(match) {
        //                 // console.log(true);
        //                 match.continue();
        //                 // console.dir(match);
        //             }
        //         };
        //         // store.openCursor(range).onsuccess = function(event) {
        //         //     console.log(event);
        //         //     var cursor = event.target.result;
        //         //     if (cursor) {

        //         //     var req = store.get(cursor.key);
        //         //         req.onsuccess = function (evt) {
        //         //           var value = evt.target.result;
        //         //           console.log(value);
        //         //         };
        //         //         cursor.continue();
        //         //     }
        //         // };

        // },


        // storeAssets : function(assets) {

        //     var transaction = IndexedDB.database.transaction(['assets'], "readwrite");
        //     var store = transaction.objectStore("assets");
        //     for(var i in assets){
        //         if(assets[i].bounds){
        //             assets[i].xmin = assets[i].bounds.sw.lng ;
        //             assets[i].ymin = assets[i].bounds.sw.lat ;
        //             assets[i].xmax = assets[i].bounds.ne.lng ;
        //             assets[i].ymax = assets[i].bounds.ne.lat ;
        //         }

        //         var request = store.put(assets[i]);
        //         request.onsuccess = function(e) {
        //                 console.log(true);
        //         };
        //         request.onerror = function(e) {
        //           console.error("Error Adding an item: ", e);
        //         };
        //     }



        // }


    };

    window.indexedDB      = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange    = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    return IndexedDB ;

});
