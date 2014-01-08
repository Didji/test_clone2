module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-ngdocs');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-ngmin');
  grunt.loadNpmTasks('grunt-eslint');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      main: {
        files: [{
          src: [
            'partials/*', 'images/*', 'css/*', 'css/vendors/*', 'javascripts/vendors/*', 'javascripts/vendors/images/*', 'css/fonts/*'
          ],
          dest: 'dist/'
        }]
      }
    },
    eslint: {
        target: [
          'javascripts/controllers/*.js',
          'javascripts/factories/*.js',
          'javascripts/filters/*.js',
          'javascripts/*.js'
        ]
    },
    concat: {
      options: {
        separator: ';'
      },
      javascripts: {
        src: [
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
        dest: 'dist/javascripts/<%= pkg.name %>.concat.js'
      },
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
    clean: ['docs/ngdocs', 'dist/javascripts/smartgeomobile.ngmin.js', 'dist/javascripts/smartgeomobile.concat.js'],
    compress: {
      main: {
        options: {
          archive: 'zip/gimap-mobile.zip'
        },

        files: [
        // {
        //   src: ['dist/**'],
        //   dest: './'
        // }
        {cwd:'dist/',src:['**'],dest:'../',expand:true},
        // {flatten: true, src: ['dist/**'], dest: './'} // flattens results to a single level
        ]
      }
    },
    uglify: {
      javascript: {
        files: {
          'dist/javascripts/smartgeomobile.js': ['dist/javascripts/smartgeomobile.ngmin.js']
        }
      }
    },
    ngmin: {
      javascript: {
        src: ['dist/javascripts/smartgeomobile.concat.js'],
        dest: 'dist/javascripts/smartgeomobile.ngmin.js'
      },
      standalone: {
        src: ['dist/javascripts/contro.concat.js'],
        dest: 'dist/javascripts/smartgeomobile.ngmin.js'
      }
    }
  });

  grunt.registerTask('doc', ['clean', 'ngdocs']);
  grunt.registerTask('dist', ['concat:javascripts', 'ngmin:javascript', 'uglify:javascript', 'copy', 'clean', 'compress']);
  grunt.registerTask('lint', ['eslint']);

};
