module.exports = function(config) {
  config.set({
    files : [
      'app/javascripts/vendors/leaflet.js',
      'app/javascripts/vendors/jquery.js',
      'app/javascripts/vendors/angular.js',
      'app/javascripts/vendors/angular.route.js',
      'app/javascripts/vendors/angular-mocks.js',
      'app/javascripts/vendors/*.js',
      'app/javascripts/smartgeomobile.js',
      'app/javascripts/smartgeo-bootstrap.js',
      'app/javascripts/factories/*.js',
      'app/javascripts/controllers/*.js',
      'test/unit/**/*.js'
    ],
    basePath: '../',
    frameworks: ['jasmine'],
    reporters: ['progress'],
    browsers: ['PhantomJS'],
    autoWatch: false,
    singleRun: true,
    colors: true
  });
};
