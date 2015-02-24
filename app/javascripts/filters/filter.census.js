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

        var metamodelWithoutProjectsOkeys;

        function _getIconFromModelOkeyForCensus(okey) {
            if (okey.search( /PROJECT_/ ) === 0) {
                var classIndex = (Project.currentLoadedProject.expressions[okey.replace( 'PROJECT_', '' )] && Project.currentLoadedProject.expressions[okey.replace( 'PROJECT_', '' )].added) || 0 ;
                return Site.current.symbology[okey + classIndex + ""] && Site.current.symbology[okey + classIndex + ""].style.symbol.icon;
            } else {
                return Site.current.symbology[okey + "0"].style.symbol.icon;
            }

        }
        return _getIconFromModelOkeyForCensus;
    }


})();
