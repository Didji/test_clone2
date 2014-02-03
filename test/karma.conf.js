module.exports = function (config) {
  config.set({

    basePath: '../',

    files: [
      'app/javascripts/vendors/mlpushmenu.js',
      'app/javascripts/vendors/alertify.js',
      'app/javascripts/vendors/leaflet.js',
      'app/javascripts/vendors/leaflet.filecache.js',
      'app/javascripts/vendors/jquery.js',
      'app/javascripts/vendors/bootstrap.js',
      'app/javascripts/vendors/select2.js',
      'app/javascripts/vendors/angular.js',
      'app/javascripts/vendors/angular-mocks.js',
      'app/javascripts/vendors/angular.route.js',
      'app/javascripts/vendors/angular.resource.js',
      'app/javascripts/vendors/angular.select2.js',
      'app/javascripts/vendors/angular.spinner.js',
      'app/javascripts/vendors/angular.ui.js',
      'app/javascripts/vendors/angular.ui.js',
      'app/javascripts/smartgeomobile.js',
      'app/javascripts/smartgeo-bootstrap.js',
      'app/javascripts/factories/*.js',
      'app/javascripts/controllers/*.js'
    ],

    exclude : ['test/coverage/**/*.js'],

    frameworks: ['jasmine'],

    autoWatch: true,

    browsers: ['Chrome'],

    reporters : ['progress', 'coverage'],

    preprocessors : {
      '**/javascripts/controllers/*.js' : 'coverage',
      '**/javascripts/factory/*.js'     : 'coverage'
    },

    coverageReporter : {
        type  : 'html',
        dir   : 'test/coverage/'
    }
  });
};
