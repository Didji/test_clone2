angular.module("smartgeomobile.config", []).constant("RIGHTS", {
    activelayers: true,
    census: false,
    consultation: true,
    downloadTiles: true,
    goto: false,
    history: false,
    logout: false,
    media: true,
    multiselection: false,
    myposition: true,
    oauth: true,
    onlyUpdateSiteDaily: true,
    parameters: true,
    photo: true,
    planning: false,
    project: false,
    report: false,
    search: true,
    //serverUrl: "http://dev-canopee-frontal.hp.m-ve.com/",
    serverUrl: "http://rec3-canopee-frontal.hp.m-ve.com/",
    serverDomain: "@m-ve.com",
    sketch: false,
    siteselection: false,
    synccenter: true,
    intent: 200,
    _MAX_SIZE_POST_REQ: 2500000, //2,5Mo
    _DONT_REALLY_RESET: false
});