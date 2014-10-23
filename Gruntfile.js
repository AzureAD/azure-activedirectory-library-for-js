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
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= pkg.author.name %> - <%= pkg.author.url %> - ' +
                  '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            my_target: {
                files: {
                    'build/adal.min.js': ['lib/adal.js']
                }
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
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // jasmine node directly js api 
    grunt.registerTask('default', ['jshint', 'jasmine_node']);
    grunt.registerTask('doc', ['jsdoc']);
    grunt.registerTask('minify', ['uglify']);
    
};