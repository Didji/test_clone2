module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-ngdocs');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      copy: {
        main: {
          files: [{
            src: [
              'partials/*', 'images/*', 'css/*', 'css/vendors/*', 'css/fonts/*'
            ],
            dest: 'dist/'
          } ]
        }
      },
      concat: {
        options: {
          separator: ';'
        },
        javascripts: {
          src: [
           'javascripts/vendors/alertify.js',
            'javascripts/vendors/mlpushmenu.js',
            'javascripts/vendors/leaflet.js',
            'javascripts/vendors/leaflet.filecache.js',
            'javascripts/vendors/leaflet.markercluster.js',
            'javascripts/vendors/jquery.js',
            'javascripts/vendors/bootstrap.js',
            'javascripts/vendors/spin.js',
            'javascripts/vendors/select2.js',
            'javascripts/vendors/angular.js',
            'javascripts/vendors/angular.route.js',
            'javascripts/vendors/angular.resource.js',
            'javascripts/vendors/angular.select2.js',
            'javascripts/vendors/angular.ui.js',
            'javascripts/vendors/angular.spinner.js',

            'javascripts/smartgeomobile.js',

            'javascripts/factories/Smartgeo.js',
            'javascripts/factories/SQLite.js',
            'javascripts/factories/G3ME.js',
            'javascripts/factories/GiReportBuilder.js',
            'javascripts/factories/Installer.js',
            'javascripts/factories/i18n.js',
            'javascripts/factories/IndexedDB.js',
            'javascripts/factories/Mission.js',

            'javascripts/i18n/smartgeomobile_fr.js',
            'javascripts/i18n/smartgeomobile_en.js',

            'javascripts/controllers/*.js',

            'javascripts/filters/*.js'
          ],
            dest: 'dist/javascripts/<%= pkg.name %>.js'
          },
        // javascriptsVendors: {
        //   src: [

        //   ],
        //     dest: 'dist/javascripts/vendors/<%= pkg.name %>-vendors.js'
        // },
          // css: {
          //  src : [
          //     'css/vendors/leaflet.css',
          //     'css/vendors/MarkerCluster.css',
          //     'css/vendors/bootstrap.css',
          //     'css/vendors/alertify.core.css',
          //     'css/vendors/alertify.default.css',
          //     'css/vendors/select2.css',
          //     'css/vendors/font-awesome.css',
          //     'css/vendors/font-awesome.min.css',
          //     'css/vendors/component.css',
          //   ],
          //   dest: 'dist/css/vendors/<%= pkg.name %>-vendors.css'
          // }
        },
        ngdocs: {
          options: {
            dest: 'docs/ngdocs',
            html5Mode: false,
            title: "Smartgeo Mobile",
            image: "images/logo.png",
          },
          all: [
            'javascripts/controllers/planningController.js',
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
        clean: ['docs/ngdocs'],
        compress: {
          main: {
            options: {
              archive: 'zip/gimap-mobile.zip'
            },
            files: [
              {src: ['dist/**'], dest: './'}
            ]
          }
        }
      });

    grunt.registerTask('doc', ['clean', 'ngdocs']);
    grunt.registerTask('dist', ['concat:javascripts', 'copy', 'compress']);

  };
