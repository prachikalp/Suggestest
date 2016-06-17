'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        mangle: false
      },
      my_target: {
        files: {
          //'dest/output.min.js': ['src/input.js']
        }
      }
    },
    watch: {
      scripts: {
        files: ['Gruntfile.js','server.js','app/**/*.js','config/**/*.js'],
        tasks: ['jshint'],
        options: {
          spawn: false,
          livereload:true
        },
      },
    },
    jshint: {
      all: {
        src: ['Gruntfile.js','server.js','app/**/*.js','config/**/*.js'],
        options: {
          jshintrc: true
        }
      }
    },
    nodemon: {
      dev:{
        script:'server.js'
      },
      options: {
        args: ['dev'],
        nodeArgs: ['--debug']
      },
      env:{

      }
    },
    concurrent: {
      target: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
  });


  // Making grunt default to force in order not to break the project.
  grunt.option('force', true);


  // Load the plugin that provides the "grunt" tasks.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-env');

  // Default task(s).
  grunt.registerTask('default', ['lint','concurrent:target']);

  grunt.registerTask('lint', ['jshint','uglify']);

};