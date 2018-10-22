var gulp       = require('gulp');
var babel      = require('gulp-babel');
var debug      = require('gulp-debug');
var sourcemaps = require('gulp-sourcemaps');
var marked     = require('gulp-marked');
var source     = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify   = require('watchify');
var gulpif     = require('gulp-if');
var uglify     = require('gulp-uglify');
var streamify  = require('gulp-streamify');
var notify     = require('gulp-notify');
var concat     = require('gulp-concat');
var cssmin     = require('gulp-cssmin');
var gutil      = require('gulp-util');
var fs         = require('fs');
var replace    = require('gulp-replace');
var chalk      = require('chalk');
var S          = require('string');
var yuidoc     = require('gulp-yuidoc');
var flatten    = require('gulp-flatten');
var n2a        = require('gulp-native2ascii');

var specific_rollup = (process.argv[3]) ? process.argv[3].replace('--', '') : undefined;
var dependencies = [];

//helper function for exporting modules into a global namespace
var _namespace = function(module){
    var base = "GlobalNOC.Atlas.";
    return base + module; 
};

//helper function to log build notifications in a consistent manner 
var _notifyComplete = function(options){
    var name  = options.name;
    var start = options.start;
    var type  = (options.type == 'css') ? 'css' : 'js';
    var min   = (options.dev) ? '' : '.min';

    console.log(
        S('['+chalk.yellow(options.name+min+'.'+type)+']').padRight(40, '.').toString() +
        'built in ' + 
        chalk.magenta((Date.now() - start) + 'ms')
    );
};

var createJS = function(options){
    options = options || {};

    // if a specific rollup was requested and this is not it just return
    if(specific_rollup !== undefined && options.name != specific_rollup){
        return;
    }

    var start = new Date();

    var namespace =  _namespace(options.name);
    var name_lower = options.name.toLowerCase();

    var file_name = (options.dev) ? 'atlas3_'+name_lower+'.js' : 'atlas3_'+name_lower+'.min.js';
    return browserify('./src/js/index/'+options.name+'.js', {
            standalone: namespace
        })
        .bundle()
        .on('error', gutil.log)
        //Pass desired output filename to vinyl-source-stream
        .pipe(source(file_name))
        //get rid of windows newline cancer
        .pipe(replace(/\r\n/g,'\n'))
        //force ascii b/c mike bostock insists on putting
        //math symbols in his code
        .pipe(n2a({reverse: false}))
        //minify if not development
        .pipe(gulpif(!options.dev, streamify(uglify({
            output: {
                ascii_only: true
            }
        }))))
        //write the completed stream to dist
        .pipe(gulp.dest('./dist/js/'))
        .pipe(notify(function () {
            _notifyComplete({
                name:  name_lower,
                start: start,
                dev: options.dev
            });
        }));
};

var createCSS = function(options){
    options = options || {};
    
    // if a specific rollup was requested and this is not it just return
    if(specific_rollup !== undefined && options.name != specific_rollup){
        return;
    }

    var start = new Date();

    var name_lower = options.name.toLowerCase();

    var file_name = (options.dev) ? 'atlas3_'+name_lower+'.css' : 'atlas3_'+name_lower+'.min.css';
    gulp.src(options.files,{base: 'src/css/'})
        .pipe(concat(file_name))
        //get rid of windows newline cancer
        .pipe(replace(/\r\n/g,'\n'))
        //minify if not development
        .pipe(gulpif(!options.dev, streamify(cssmin())))
        .pipe(gulp.dest('./dist/css/'))
        .pipe(notify(function () {
            _notifyComplete({
                name:  name_lower,
                start: start,
                type: 'css',
                dev: options.dev
            });
        }));
};

var createPlugin = function(options){
    options = options || {};
    
    gulp.src(options.files)
       .pipe(debug())
       .pipe(sourcemaps.init())
       .pipe(babel({
	   presets:  ["es2015"],
           plugins: ['transform-es2015-modules-systemjs', "transform-es2015-for-of"],
       }))
        .pipe(sourcemaps.write('.'))
	.pipe(gulp.dest('./dist'));
}

//build all widgets
var buildAll = function(options){
    options = options || {};
    options.dev = options.dev || false;
    gulp.src('./BUILD.md').pipe(gulp.dest('./dist'));
    gulp.src('./LICENSE').pipe(gulp.dest('./dist'));
    gulp.src('./README.md').pipe(gulp.dest('./dist'));
    gulp.src('src/plugin.json').pipe(gulp.dest('./dist'));
    gulp.src('src/partials/module.html').pipe(gulp.dest('./dist'));
    gulp.src('src/partials/editor.html').pipe(gulp.dest('./dist'));
    gulp.src('src/partials/display_editor.html').pipe(gulp.dest('./dist'));
    gulp.src('src/partials/json_editor.html').pipe(gulp.dest('./dist'));
    createPlugin({ files: [ './src/*.js',]});

    //create the datasource
    createJS({
        name: 'DataSource',
        dev: options.dev
    });
    
    //create the LeafletMap
    createJS({
            name: 'LeafletMap',
            dev: options.dev});
    createCSS({
            name: 'LeafletMap',
                files: [
                        './src/css/MiniMap.css',
                        './src/css/NetworkLayer.css',
                        './node_modules/leaflet/dist/leaflet.css',
                        './src/css/TrafficLayer.css',
                        './src/css/Legend.css' 
                        ],
                dev: options.dev
                });

    //create the Dialog css
    createCSS({
        name: 'Dialog',
        files: [
            './node_modules/alertifyjs/build/css/alertify.css',
            './node_modules/alertifyjs/build/css/themes/default.css',
            './src/css/Dialog.css',
        ],
        dev: options.dev,
    });

    //create the editor
    createJS({
        name: 'Legend',
        dev: options.dev,
    });
    //create the editor css
    createCSS({
        name: 'Legend',
        files: [
            './css/Legend.css'
        ],
        dev: options.dev,
    });
};

// Starts our development workflow
gulp.task('default', function () {
    buildAll({
        dev: true
    });
});

// Builds our minified production rollups
gulp.task('deploy', function () {
    buildAll();
    buildAll({dev: true});
});
