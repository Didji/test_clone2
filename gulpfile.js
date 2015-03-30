var gulp = require('gulp');
var os = require('os');
var fs = require('fs');
var zip = require('gulp-zip');
var jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    exec = require('gulp-exec'),
    prompt = require('gulp-prompt'),
    open = require('gulp-open'),
    webserver = require('gulp-webserver');

gulp.task('default', function() {
    gulp.src('app')
        .pipe(webserver({
            livereload: true,
            open: "http://localhost:8000/index.html"
        }));
});

gulp.task('bump-version', function() {
    var versionJSContent = "";
    var testt = "hh";
    gulp.src('app/javascripts/version.js')
        .pipe(prompt.prompt({
            type: 'input',
            name: 'version',
            message: 'Numero de version'
        }, function(res) {
                res.version = res.version.split('rc');
                versionJSContent += 'window.smargeomobileversion = "' + res.version[0] + '" ;';
                if (res.version[1]) {
                    versionJSContent += 'window.smargeomobilebuild = "rc' + res.version[1] + '" ;';
                }

                fs.writeSync(fs.openSync("./app/javascripts/version.js", "w"), versionJSContent);

                var androidManifestPath = "./platforms/android/content-shell/AndroidManifest.xml" ;
                var androidManifestContent = fs.readFileSync(androidManifestPath, 'utf8');
                androidManifestContent = androidManifestContent.replace(/versionName="([0-9|\.]*)"/, function(match, p1) {
                    return match.replace(p1, res.version.join('rc'));
                });
                androidManifestContent = androidManifestContent.replace(/versionCode="([0-9]*)"/, function(match, p1) {
                    return match.replace(p1, res.version.join('').replace('.', '') + "000");
                });
                fs.writeSync(fs.openSync(androidManifestPath, "w"), androidManifestContent);

                var iosPlistPath = "./platforms/ios/platforms/ios/Smartgeo/Smartgeo-Info.plist" ;
                var iosPlistContent = fs.readFileSync(iosPlistPath, 'utf8');
                iosPlistContent = iosPlistContent.replace(/<key>CFBundleShortVersionString<\/key>\s*<string>([0-9|\.]*)<\/string>/gi, function(match, p1) {
                    return match.replace(p1, res.version[0]);
                });
                iosPlistContent = iosPlistContent.replace(/<key>CFBundleVersion<\/key>\s*<string>([0-9a-z|\.]*)<\/string>/gi, function(match, p1) {
                    return match.replace(p1, res.version[1]);
                });
                fs.writeSync(fs.openSync(iosPlistPath, "w"), iosPlistContent);
                return versionJSContent;
            }));
});

gulp.task('package-android', function() {
    gulp.src('./app/**/*')
        .pipe(zip('gimap-mobile.zip'))
        .pipe(gulp.dest('platforms/android/content-shell/assets/'));

    gulp.src('./platforms/android/content-shell').pipe(exec('pwd')); //.pipe(exec('../gradlew --continue --no-rebuild --parallel --quiet --stacktrace build'));
});

gulp.task('package-ios', function() {
    gulp.src('app/*')
        .pipe(gulp.dest('platforms/ios/www/'));
    gulp.src('app/*')
        .pipe(gulp.dest('platforms/ios/platforms/ios/www/'))

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
