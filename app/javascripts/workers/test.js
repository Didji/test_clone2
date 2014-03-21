// postMessage("I\'m working before postMessage(\'ali\').");

onmessage = function (oEvent) {
    // console.log(openDatabaseSync);
    openDatabaseSync();
    // var o = JSON.parse() ;
    // console.log(JSON.stringify(oEvent.data));
  // postMessage("Hi " + oEvent.data);
};
