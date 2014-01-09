module.exports = function (config) {
  config.set({

    basePath: '../',

    files: [

      'javascripts/vendors/mlpushmenu.js',
      'javascripts/vendors/alertify.js',
      'javascripts/vendors/leaflet.js',
      'javascripts/vendors/leaflet.filecache.js',
      'javascripts/vendors/jquery.js',
      'javascripts/vendors/bootstrap.js',
      'javascripts/vendors/select2.js',
      'javascripts/vendors/angular.js',
      'javascripts/vendors/angular-mocks.js',
      'javascripts/vendors/angular.route.js',
      'javascripts/vendors/angular.resource.js',
      'javascripts/vendors/angular.select2.js',
      'javascripts/vendors/angular.spinner.js',
      'javascripts/vendors/angular.ui.js',
      'javascripts/vendors/angular.ui.js',
      'javascripts/smartgeomobile.js',
      'javascripts/factories/*.js',
      'javascripts/factories/Smartgeo.js',
      'javascripts/factories/SQLite.js',
      'javascripts/factories/G3ME.js',
      'javascripts/factories/GiReportBuilder.js',
      'javascripts/factories/Installer.js',
      'javascripts/controllers/*.js',
      'javascripts/controllers/consultationController.js',
      'javascripts/controllers/mapController.js',
      'javascripts/controllers/menuController.js',
      'javascripts/controllers/recensementController.js',
      'javascripts/controllers/reportController.js',
      'javascripts/controllers/siteInstallController.js',
      'javascripts/controllers/siteUpdateController.js',
      'javascripts/controllers/siteUninstallController.js',
      'javascripts/controllers/siteListController.js',
      'javascripts/controllers/searchController.js',
      'javascripts/controllers/layersController.js',
      'javascripts/controllers/synchronizationMenuController.js',
      'javascripts/controllers/intentController.js',

      'test/controllersSpec.js',
      'test/factoriesSpec.js'
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
