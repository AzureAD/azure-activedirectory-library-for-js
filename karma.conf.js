module.exports = function (config) {
    'use strict';

    var testWebpackConfig = require('./webpack.test.config.js')();

    config.set({
        basePath: './',
        frameworks: ["jasmine"],
        // list of files / patterns to load in the browser
        files: [
            //{ pattern: 'dist/*.js', included: true },
            { pattern: './karma.specs.js', watched: true },
        ],

        // list of files / patterns to exclude
        exclude: [],

        preprocessors: {
            './karma.specs.js': ['webpack', 'sourcemap'],
            //'*.ts': ['webpack', 'sourcemap', 'coverage'],
            //'**/!(*.spec)+(.js)': ['coverage']
            //'**/*.js': ['coverage']
        },


        webpackServer: {
            noInfo: true
            //progress:false,
            //stats: false,
            //debug:false
        },

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: (process.env.IS_TRAVIS == null) ? true : false,

        browsers: [
            //"Firefox",
            "Chrome",
            //"IE",
            //"PhantomJS"
        ],

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: (process.env.IS_TRAVIS == null) ? false : true,

        reporters: ['progress', 'coverage', 'dots'],

        // Webpack Config at ./webpack.test.config.js
        webpack: testWebpackConfig,

        coverageReporter: {
            // specify a common output directory 
            dir: './coverage',
            reporters: [
                { type: 'html', subdir: 'report-html' },
                // generates ./coverage/lcov.info
                {type:'lcovonly', subdir: '.'}
                // generates ./coverage/coverage-final.json
                //{type:'json', subdir: '.'},

            ]
        }
    });
};