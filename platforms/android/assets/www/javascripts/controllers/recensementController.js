function recensementController($scope, $routeParams, $window, $rootScope){

    var armoire = {
            label:'Armoire',
            fields : [{
                label: 'Code Armoire',
                type : 'T'
            },{
                label: 'Etat Armoire',
                type : 'T'
            }],
            children : null,
            parent : null
        },
        lampe = {
            label: "Lampe",
            nomenclature: "LMP-[[PARENT_ID]]-[[ID]]",
            fields : [{
                label: 'Code Lampe',
                type : 'T'
            },{
                label: 'Etat Lampe',
                type : 'T'
            }],
            parent: lanterne,
            children: null
        },
        lanterne = {
            label: "Lanterne",
            nomenclature: "LTRN-[[PARENT_ID]]-[[ID]]",
            fields : [{
                label: 'Code Lanterne',
                type : 'T'
            },{
                label: 'Etat Lanterne',
                type : 'T'
            }],
            children : [lampe,lampe,lampe],
            parent: support
        },
        support = {
            label: "Support",
            nomenclature: "SPRT-[[PARENT_ID]]-[[ID]]",
            fields : [{
                label: 'Code Support',
                type : 'T'
            },{
                label: 'Etat Support',
                type : 'T'
            }],
            children : [lanterne],
            parent: point
        },
        point = {
            label: 'Point lumineux',
            nomenclature: "PL-[[ID]]",
            fields : [{
                label: 'Point lumineux',
                type : 'T'
            },{
                label: 'Point lumineux',
                type : 'T'
            }],
            children : [support, support],
            parent: null // a virer ?
        } ;

    $scope.types = [
        // armoire , point, lampe, lanterne, support
        armoire , point, lampe, lanterne
    ];

}

