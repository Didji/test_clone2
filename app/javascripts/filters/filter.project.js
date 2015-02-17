(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .filter( 'currentProjectCensusFilter', currentProjectCensusFilter );

    currentProjectCensusFilter.$inject = ["Project"];

    function currentProjectCensusFilter(Project) {
        /**
         * @name _currentProjectCensusFilter
         * @desc
         */

        var metamodelWithoutProjectsOkeys;

        function _currentProjectCensusFilter(metamodel) {
            if (Project.currentLoadedProject) {
                return metamodel;
            }

            if (metamodelWithoutProjectsOkeys) {
                return metamodelWithoutProjectsOkeys;
            } else {
                metamodelWithoutProjectsOkeys = {} ;
            }

            for (var okey in metamodel) {
                if (okey.search( /PROJECT_/ ) !== 0) {
                    metamodelWithoutProjectsOkeys[okey] = angular.copy( metamodel[okey] );
                }
            }

            return metamodelWithoutProjectsOkeys;

        }
        return _currentProjectCensusFilter;
    }


})();
