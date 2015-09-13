/** @typedef {Object} grunt.initConfig */

module.exports = function (grunt) {
    //process.env.NODE_ENV = 'test';

    // load all task libs begining with: grunt-*
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    //noinspection JSUnusedGlobalSymbols
    grunt.initConfig({
        jshint: {
            all: ['Gruntfile.js', 'lib/*.js', 'lib/drivers/*.js']
        },
        markdown: {
            all: {
                files: [
                    {
                        expand: true,
                        src: 'README.md',
                        dest: '.',
                        ext: '.html'
                    }
                ],
                options: {
                    preCompile:  function(src, context) {},
                    postCompile: function(src, context) {},
                    templateContext: {},
                    contextBinder: false,
                    contextBinderMark: '@@@',
                    autoTemplate: true,
                    autoTemplateFormat: 'jst',
                    markdownOptions: {
                        gfm: true,
                        highlight: 'auto'
                    }
                }
            }
        },
        jsdoc : {
            dist : {
                src: ['index.js'],
                options: {
                    destination: 'doc'
                }
            }
        }
    });
};
