onmessage = function (e) {
    openDatabase(e.data.database, '0.0.1-angular', e.data.database, 1024 * 1024 * 4).transaction(function (tx) {
        tx.executeSql(e.data.request, e.data.args,
            function (tx, results) {
                var rows = results.rows, r = {}, asset ;
                for(var i=0, length = rows.length; i< length ; i++){
                    asset = rows.item(i) ;
                    r[asset.tileUuid] = r[asset.tileUuid] || [];
                    r[asset.tileUuid].push(rows.item(i));
                }
                postMessage(r);
            }, function(){
                console.log(JSON.stringify(e.data.request));
                console.log(JSON.stringify(arguments));
            });
    });
};
