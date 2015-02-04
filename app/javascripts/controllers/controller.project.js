(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .controller( 'ProjectController', ProjectController );

    ProjectController.$inject = ["$scope", "Project"];

    /**
     * @class ProjectController
     * @desc Controlleur de la page des projets.
     */

    function ProjectController($scope, Project) {

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
                $scope.$digest();
            } );
        }

        /**
         * @name getRemoteProjects
         * @desc Récupère la liste des projets sur le serveur
         */
        function getRemoteProjects() {
            Project.list().success( function(data) {
                vm.projects = data ;
                for (var i = 0; i < vm.projects.length; i++) {
                    vm.projects[i] = Project.save( vm.projects[i] );
                }
            } );
        }

        /**
         * @name getLocalProjects
         * @desc Récupère la liste des projets locaux
         */
        function getLocalProjects(callback) {
            callback = callback || function() {};
            Project.findAll( function(projects) {
                vm.projects = projects || [] ;
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



    }

})();
