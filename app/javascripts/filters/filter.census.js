(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .filter( 'getIconFromModelOkeyForCensus', getIconFromModelOkeyForCensus );

    getIconFromModelOkeyForCensus.$inject = ["Site", "Project"];

    function getIconFromModelOkeyForCensus(Site, Project) {
        /**
         * @name _getIconFromModelOkeyForCensus
         * @desc
         */

        function _getIconFromModelOkeyForCensus(okey) {
            var currentSymbology = Site.current.symbology;
            if (okey.search( /PROJECT_/ ) === 0) {
                var classIndex = (Project.currentLoadedProject.expressions[okey.replace( 'PROJECT_', '' )] && Project.currentLoadedProject.expressions[okey.replace( 'PROJECT_', '' )].added) || 0 ;
                return currentSymbology[okey + classIndex + ""] && currentSymbology[okey + classIndex + ""].style.symbol.icon;
            } else {
                return currentSymbology[okey + "0"] && currentSymbology[okey + "0"].style.symbol.icon;
            }

        }
        return _getIconFromModelOkeyForCensus;
    }


})();
