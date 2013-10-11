module.exports = function (config) {
  config.set({
    basePath: '../',

    files: [

      'javascripts/vendors/mlpushmenu.js',
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
      'javascripts/vendors/angular.ui.js',
      'javascripts/smartgeomobile.js',
      'javascripts/factory/Smartgeo.js',
      'javascripts/factory/SQLite.js',
      'javascripts/factory/G3ME.js',
      'javascripts/factory/GiReportBuilder.js',
      'javascripts/factory/Installer.js',
      'javascripts/controllers/authController.js',
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

      'test/**/*.js'
    ],

    frameworks: ['jasmine'],

    autoWatch: true,

    browsers: ['Chrome'],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }
  });
};
