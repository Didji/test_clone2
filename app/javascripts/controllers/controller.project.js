(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ProjectController', ProjectController );

    ProjectController.$inject = ["$scope", "$rootScope", "Project", "i18n"];

    /**
     * @class ProjectController
     * @desc Controlleur de la page des projets.
     */

    function ProjectController($scope, $rootScope, Project, i18n) {

        var vm = this;

        vm.getRemoteProjects = getRemoteProjects ;
        vm.loadProject = loadProject ;

        vm.projects = [];
        vm.loading = true ;

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
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
                callback();
                vm.loading = false;
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



    }

})();
