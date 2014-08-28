angular.module('smartgeomobile').filter('urlShortener', urlShortener);

function urlShortener() {

    /**
     * @method
     * @memberOf    authController
     * @desc        Translate "http://smartgeo.fr/index.php?service=" to "smartgeo.fr"
     */
    function shortener(url) {
        return url.replace(/^https?:\/\/(.+)\/index\.php.*$/, '$1');
    }

    return shortener ;
}
