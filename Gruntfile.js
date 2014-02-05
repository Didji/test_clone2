module.exports = function(grunt) {

    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        shell: {
            options: {
                stdout: true
            },
            selenium: {
                command: './selenium/start',
                options: {
                    stdout: false,
                    async: true
                }
            },
            protractor_install: {
                command: 'node ./node_modules/protractor/bin/webdriver-manager update'
            },
            npm_install: {
                command: 'npm install'
            }
        },

        jsbeautifier: {
            files: ["app/javascripts/**/*.js"],
            options: {
                js: {
                    braceStyle: "collapse",
                    breakChainedMethods: false,
                    e4x: false,
                    evalCode: false,
                    indentChar: " ",
                    indentLevel: 0,
                    indentSize: 4,
                    indentWithTabs: false,
                    jslintHappy: true,
                    keepArrayIndentation: false,
                    keepFunctionIndentation: false,
                    maxPreserveNewlines: 10,
                    preserveNewlines: true,
                    spaceBeforeConditional: true,
                    spaceInParen: false,
                    unescapeStrings: false,
                    wrapLineLength: 0
                }
            }
        },

        plato: {
            report: {
                files: {
                    'test/reports': [
                        'app/javascripts/controllers/*.js',
                        'app/javascripts/filters/*.js',
                        'app/javascripts/factories/*.js',
                        'app/javascripts/filters/*.js',
                        'app/javascripts/*.js'
                    ],
                },
            },
        },

        complexity: {
            generic: {
                src: ['app/javascripts/controllers/*.js', 'app/javascripts/filters/*.js', 'app/javascripts/factories/*.js', 'app/javascripts/filters/*.js', 'app/javascripts/*.js'],
                options: {
                    breakOnErrors: true,
                    // jsLintXML: 'report.xml', // create XML JSLint-like report
                    // checkstyleXML: 'checkstyle.xml', // create checkstyle report
                    errorsOnly: false, // show only maintainability errors
                    cyclomatic: [3, 7, 12], // or optionally a single value, like 3
                    halstead: [8, 13, 20], // or optionally a single value, like 8
                    maintainability: 90,
                    hideComplexFunctions: true
                }
            }
        },

        coverage: {
            options: {
                thresholds: {
                    'statements': 1,
                    'branches': 1,
                    'lines': 1,
                    'functions': 1
                },
                dir: 'coverage',
                root: 'test'
            }
        },

        connect: {
            options: {
                base: 'app/'
            },
            webserver: {
                options: {
                    port: 8888,
                    keepalive: true
                }
            },
            devserver: {
                options: {
                    port: 8888
                }
            },
            testserver: {
                options: {
                    port: 9999
                }
            },
            coverage: {
                options: {
                    base: 'test/coverage/',
                    port: 5555,
                    keepalive: true
                }
            }
        },

        protractor: {
            options: {
                keepAlive: true,
                configFile: "./test/protractor.configuration.js"
            },
            singlerun: {},
            auto: {
                keepAlive: true,
                options: {
                    args: {
                        seleniumPort: 4444
                    }
                }
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'app/javascripts/controllers/*.js',
                'app/javascripts/filters/*.js',
                'app/javascripts/factories/*.js',
                'app/javascripts/*.js',
            ]
        },

        open: {
            devserver: {
                path: 'http://localhost:8888'
            },
            coverage: {
                path: 'http://localhost:5555'
            }
        },

        karma: {
            unit: {
                configFile: './test/karma.unit.configuration.js',
                autoWatch: false,
                singleRun: true
            },
            unit_auto: {
                configFile: './test/karma.unit.configuration.js',
                autoWatch: true,
                singleRun: false
            },
            unit_coverage: {
                configFile: './test/karma.unit.configuration.js',
                autoWatch: false,
                singleRun: true,
                reporters: ['progress', 'coverage'],
                preprocessors: {
                    'app/javascripts/**/*.js': ['coverage']
                },
                coverageReporter: {
                    type: 'html',
                    dir: 'test/coverage/'
                }
            },
        }
    });

    //single run tests
    grunt.registerTask('test', ['jsbeautifier', 'jshint', 'test:e2e', 'test:coverage']);
    // grunt.registerTask('test', ['jsbeautifier', 'jshint', 'test:e2e', 'test:coverage','coverage', 'plato:report', 'complexity:generic']);
    grunt.registerTask('test:unit', ['karma:unit']);
    grunt.registerTask('test:e2e', ['connect:testserver', 'protractor:singlerun']);

    //autotest and watch tests
    grunt.registerTask('autotest', ['karma:unit_auto']);
    grunt.registerTask('autotest:unit', ['karma:unit_auto']);
    grunt.registerTask('autotest:e2e', ['connect:testserver', 'shell:selenium']);

    //coverage testing
    grunt.registerTask('test:coverage', ['karma:unit_coverage']);
    grunt.registerTask('coverage_', ['karma:unit_coverage', 'open:coverage', 'connect:coverage']);

    //installation-related
    grunt.registerTask('install', ['update', 'shell:protractor_install']);
    grunt.registerTask('update', ['shell:npm_install']);

    //defaults
    grunt.registerTask('default', ['dev']);

    //development
    grunt.registerTask('dev', ['update', 'connect:devserver', 'open:devserver']);

    //server daemon
    grunt.registerTask('serve', ['connect:webserver']);
    grunt.registerTask('beauty', ['jsbeautifier']);
};
