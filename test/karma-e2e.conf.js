module.exports = function (config) {
  config.set({
    basePath: '../',

    files: [
      'test/controllersSpec-e2e.js'
    ],

    // frameworks: ['ng-scenario'],

    autoWatch: false,

    browsers: ['Chrome'],

    // singleRun: true,

    proxies: {
      '/': 'http://localhost:3333/test/'
    },

    junitReporter: {
      outputFile: 'test_out/e2e.xml',
      suite: 'e2e'
    }
  });
};
