module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ['build/'],
        jsdoc: {
            dist: {
                src: ['lib/*.js'],
                options: {
                    destination: 'doc'
                }
            }
        },
        jshint: {
            src: {
                options: {
                  jshintrc: '.jshintrc'
                },
                src: ['lib/*.js']
            }
        },
        jasmine_node: {
            options: {
                forceExit: true,
                match: '.',
                matchall: false,
                extensions: 'js',
                specNameMatcher: 'spec',
                jUnit: {
                    report: true,
                    savePath: "./build/reports/jasmine/",
                    useDotNotation: true,
                    consolidate: true
                }
            },
            all: ['tests/unit/spec/']
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jasmine-node');
    // uglify task is producing invalid js file

    // jasmine node directly js api 
    grunt.registerTask('default', ['jshint', 'jasmine_node']);
    grunt.registerTask('doc', ['jsdoc']);
    grunt.registerTask('minify', ['uglify']);
    
};