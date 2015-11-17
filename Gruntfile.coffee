module.exports = (grunt) ->

  # Load grunt tasks automatically, when needed
  require("jit-grunt") grunt

  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    meta:
      banner: '/* <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */\n'
    coffeelint:
      src: 'src/**/*.coffee'
      options:
        max_line_length:
          level: 'ignore'
        line_endings:
          value: 'unix'
          level: 'error'
        no_stand_alone_at:
          level: 'error'
    clean:
      options:
        force: true
      build: ["compile/**", "build/**"]
    coffee:
      compile:
        files: [
          {
            expand: true
            cwd: 'src/'
            src: '**/*.coffee'
            dest: 'compile/'
            ext: '.js'
          }
        ],
        options:
          bare: true
    concat:
      options:
        banner: '<%= meta.banner %>'
      dist:
        src: 'compile/**/*.js'
        dest: 'build/angular-resource-watcher.js'
    uglify:
      options:
        banner: '<%= meta.banner %>'
      dist:
        src: ['build/angular-resource-watcher.js']
        dest: 'build/angular-resource-watcher.min.js'

    karma:
      unit:
        configFile: "karma.conf.js"
        singleRun: true

  grunt.registerTask 'default', ['coffeelint', 'clean', 'coffee', 'concat', 'uglify']

  grunt.registerTask 'test', [
    "coffee"
    "karma"    
  ]