(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ProjectController', ProjectController );

    ProjectController.$inject = ["$scope", "$rootScope", "$interval", "Project", "i18n"];

    /**
     * @class ProjectController
     * @desc Controlleur de la page des projets.
     */

    function ProjectController($scope, $rootScope, $interval, Project, i18n) {

        var vm = this,
            _CHECK_REMOTE_LOCKED_INTERVAL = 60000,
            _CHECK_REMOTE_LOCKED_ID ;

        vm.getRemoteProjects = getRemoteProjects ;
        vm.loadProject = loadProject ;

        vm.projects = [];
        vm.loading = false ;

        activate();

        /**
         * @name activate
         * @desc Fonction d'initialisation
         */
        function activate() {
            getLocalProjects( function() {
                vm.loading = false ;
                for (var i = 0; i < vm.projects.length; i++) {
                    if (vm.projects[i].loaded === true) {
                        vm.projects[i].load();
                        break;
                    }
                }
                if (!vm.projects.length) {
                    getRemoteProjects();
                }
                $scope.$digest();
            } );

            $rootScope.$on( 'UPDATE_PROJECTS', function() {
                getLocalProjects();
            } );

            checkRemoteLockedAssets();
            _CHECK_REMOTE_LOCKED_ID = $interval( checkRemoteLockedAssets, _CHECK_REMOTE_LOCKED_INTERVAL );

            $scope.$on( "$destroy", function() {
                $interval.cancel( _CHECK_REMOTE_LOCKED_ID );
            } );

        }

        /**
         * @name getRemoteProjects
         * @desc Récupère la liste des projets sur le serveur
         */
        function getRemoteProjects() {
            if (Project.currentLoadedProject) {
                alertify.alert( i18n.get( '_PROJECTS_LIST_CANT_BE_LOAD_' ) );
            } else {
            	vm.loading = true;
                Project.list().success( function(data) {
                	if (!data.length || "string" === typeof data) {
                		return false;
                	}
                    vm.projects = data ;
                    for (var i = 0; i < vm.projects.length; i++) {
                        vm.projects[i] = Project.save( vm.projects[i] );
                    }
                } ).finally( function(){
                	vm.loading = false;
                } );
            }
        }

        /**
         * @name getLocalProjects
         * @desc Récupère la liste des projets locaux
         */
        function getLocalProjects(callback) {
            callback = callback || function() {};
            vm.loading = true;
            Project.findAll( function(projects) {
                vm.projects = projects || [] ;
                vm.loading = false;
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
                callback();
            } );
        }

        /**
         * @name loadProject
         * @desc
         */
        function loadProject(project) {
            project.load( function() {
                getLocalProjects();
            } );
        }

        function checkRemoteLockedAssets() {
            Project.checkRemoteLockedAssets();
        }



    }

})();
