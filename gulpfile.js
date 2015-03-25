var gulp = require('gulp');
var os = require('os');
var jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    open = require('gulp-open'),
    webserver = require('gulp-webserver');

gulp.task('default', function() {
    gulp.src('app')
        .pipe(webserver({
            livereload: true,
            open: "http://localhost:8000/index.html"
        }));
});

gulp.task('dist', function() {

    gulp.src('app/javascripts/vendors/*/*')
        .pipe(gulp.dest('dist/vendors/'));

    gulp.src('app/partials/*')
        .pipe(gulp.dest('dist/partials/'));

    gulp.src('app/css/*/*')
        .pipe(gulp.dest('dist/css/'));

    gulp.src('app/images/*')
        .pipe(gulp.dest('dist/images/'));

    gulp.src([
        'app/javascripts/*.js',
        'app/javascripts/controllers/*.js',
        'app/javascripts/directives/*.js',
        'app/javascripts/factories/*.js',
        'app/javascripts/filters/*.js',
        'app/javascripts/services/*.js',
        'app/javascripts/i18n/*.js'
    ]).pipe(jshint('app/.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(concat('smartgeomobile.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist'))
        .pipe(notify({
            message: '"dist" task complete'
        }));
});
