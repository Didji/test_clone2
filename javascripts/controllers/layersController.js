function layersController($scope, G3ME) {
    // TODO : trouver mieux
    $scope.mlPushMenu = new mlPushMenu( document.getElementById( 'mp-menu' ), document.getElementById( 'trigger' ),{type : 'cover'});

    // Initialisation du scope.
    var groups = {}, o, layers = {}, layer;
    for (var i in $scope.site.metamodel) {
        o = $scope.site.metamodel[i];
        if(! (o.group in groups)) {
            groups[o.group] = {
                label: o.group,
                status: true,
                layers: []
            };
        }
        layer = {
            status: true,
            label: o.label,
            okey: o.okey
        };
        groups[o.group].layers.push(layer);
        layers[o.okey] = layer;
    }
    
    $scope.groups = groups;
    $scope.layers = layers;

    function checkGroup(g) {
        var stat = false,
            lays = g.layers;
        
        for(var i in lays) {
            stat = stat || lays[i].status;
        }
        g.status = stat;
    }
    
    $scope.refreshView = function() {
        for(var i in $scope.groups) {
            checkGroup($scope.groups[i]);
        }
        
        G3ME.setVisibility($scope.layers);
    };
    
    $scope.updateGroups = function(gid) {
        var g = $scope.groups[gid],
            stat = g.status,
            lays = g.layers;
        
        for(var i in lays) {
            lays[i].status = stat;
        }
        $scope.refreshView();
    };
    
}