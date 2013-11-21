module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-ngdocs');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({
    ngdocs: {
      options: {
        dest: 'docs/ngdocs',
        html5Mode: false,
        title: "Smartgeo Mobile Documentation",
        // image: "images/logo.png",
        // imageLink: "http://gismartware.com",
      },
      all: [
      'javascripts/factories/Smartgeo.js',
      'javascripts/factories/G3ME.js',
      ]
    },
    connect: {
      options: {
        keepalive: true
      },
      server: {}
    },
    clean: ['docs/ngdocs']
  });

  grunt.registerTask('default', ['clean', 'ngdocs']);

};
