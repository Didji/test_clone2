angular.module( 'smartgeomobile' ).factory( 'LicenseManager', function($location, $rootScope, G3lic, i18n, Right, Utils) {

    'use strict';

    /**
     * @class LicenseManager
     * @property {object} rights Droits (ou options) accordés au terminal
     * @desc L'objet LicenseManager est un singleton, il vérifie à son instanciation que le terminal est enregistré.
     *       Si ce n'est pas le cas, il redirige l'utilisateur sur la page d'enregistrement
     */
    var LicenseManager = function() {

        return $rootScope.rights = {
            census: true,
            consultation: true,
            search: true,
            logout: true,
            report: true,
            parameters: true,
            planning: true,
            history: true,
            photo: true,
            project: true,
            media: true,
            myposition: true,
            activelayers: true,
            goto: true,
            synccenter: true,
            siteselection: true,
            _DONT_REALLY_RESET: false,
            //lors de la mise à jour quotidienne, cela concerne-t-il le site ou le site ET les données?
            //par défaut, et si le droit n'est pas spécifié, tout est mis à jour
            onlyUpdateSiteDaily: false
        };

        if (!this.__isDeviceRegistered()) {
            this.__rights = {};
            this.__dispatchRights();
            $location.path( 'register' );
            return this;
        }
        this.__rights = this.__getRights();
        this.__dispatchRights();
        return this.update();
    };

    /**
     * @memberOf LicenseManager
     * @member {object} __rights
     * @desc Droits accordés par g3lic
     * @example LicenseManager.prototype.__rights =  {
     *        "consultation" : true ,
     *        "server"       : "beta.smartgeo.fr" ,
     * }
     */
    LicenseManager.prototype.__rights = {};

    /**
     * @memberOf LicenseManager
     * @member {number} __offline_verification_block_threshold
     * @desc Nombre de vérification hors ligne à atteindre avant de bloquer l'utilisation de l'application
     */
    LicenseManager.prototype.__offline_verification_block_threshold = 10;

    /**
     * @memberOf LicenseManager
     * @member {number} __offline_verification_block_threshold
     * @desc Nombre de vérification hors ligne à atteindre avant d'avertir l'utilisateur
     */
    LicenseManager.prototype.__offline_verification_warn_threshold = 7;

    /**
     * @memberOf LicenseManager
     * @member {number} __max_time_between_check
     * @desc Temps max entre 2 vérifications de licence en millisecond (86400000 === 1 jour)
     */
    LicenseManager.prototype.__max_time_between_check = 1;

    /**
     * @method
     * @memberOf LicenseManager
     * @returns {boolean} Validité de la licence
     * @desc Retourne "true" si le terminal a une licence, "false sinon"
     */
    LicenseManager.prototype.__isDeviceRegistered = function() {
        return !!JSON.parse( localStorage['LicenseManager.license'] || "{}" ).registered;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @param {object} options Options retournés par g3lic
     * @returns {object} Droits au format exploitable par Smartgeo Mobile
     * @desc Parse les options retournées par g3lic pour les rendre exploitable par SmartgeoMobile
     */
    LicenseManager.prototype.__parseG3licResponse = function(options) {
        var rights = {};
        for (var i = 0; i < options.length; i++) {
            rights[options[i].code] = (options[i].value === "undefined" ? true : options[i].value);
        }
        return rights;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @param {object} rights Droits à enregistrer
     * @desc Enregistre les droits passés en paramètres et met à jour le $rootScope pour être exploité
     *       depuis n'importe ou.
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.__setRights = function(rights) {
        localStorage['LicenseManager.rights'] = JSON.stringify( rights || {} );
        this.__dispatchRights( rights );
        return this;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @returns {object} Droits stockés dans le terminal
     * @desc Retourne les droits stockés dans le terminal
     */
    LicenseManager.prototype.__getRights = function() {
        return JSON.parse( localStorage['LicenseManager.rights'] || "{}" );
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @param {object} rights Droits à dispatcher
     * @desc Dispatche les droits vers le $rootScope
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.__dispatchRights = function(rights) {
        $rootScope.rights = Right.values = this.__rights = (rights || this.__rights);
        return this;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @param {object} license Licence à enregistrer
     * @desc Enregistre la licence passée en paramètres dans le terminal
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.__setLicense = function(license) {
        localStorage['LicenseManager.license'] = JSON.stringify( license || {} );
        return this;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @desc Retourne la licence stockée dans le terminal
     * @returns {object} Licence stockée dans le terminal
     */
    LicenseManager.prototype.__getLicense = function() {
        return JSON.parse( localStorage['LicenseManager.license'] || "{}" );
    };


    /**
     * @method
     * @memberOf LicenseManager
     * @desc Callback d'erreur de la mise à jour d'une licence
     */
    LicenseManager.prototype.__updateErrorCallback = function(response) {
        switch (response.status) {
            case 0:
                var license = this.__getLicense();
                license.offline_verification = (license.offline_verification || 0) + 1;
                if (license.offline_verification >= this.__offline_verification_block_threshold) {
                    alertify.log( i18n.get( "_REGISTER_MUST_CHECK_" ) );
                    $location.path( 'licenseRevoked' );
                } else if (license.offline_verification >= this.__offline_verification_warn_threshold) {
                    alertify.log( i18n.get( "_REGISTER_CAREFUL_", (this.__offline_verification_block_threshold - license.offline_verification) ) );
                }
                this.__setLicense( license );
                break;
            case 404:
                // UGLYALERT: return something more explicit from g3lic (like 403) (@gulian)
                $location.path( 'licenseRevoked' );
                return;
            default:
                console.error( response );
                break;
        }
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @desc Vérifie la validité de la licence, et redirige ou non l'utilisateur en conséquence
     * @param {function} success Callback de succès
     * @param {function} error Callback d'erreur
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.update = function(force, success, error) {
        if (typeof force !== "boolean") {
            error = success || function() {};
            success = force || function() {};
            force = false;
        } else {
            error = error || function() {};
            success = success || function() {};
        }

        var this_ = this,
            license = this.__getLicense(),
            now = new Date();

        if (!force && (now - new Date( license.lastcheck )) < this.__max_time_between_check) {
            return this;
        }

        G3lic.check( license, function(options) {
            license.registered = true;
            license.lastcheck = now;
            license.offline_verification = 0;
            this_.__setRights( this_.__parseG3licResponse( options ) );
            this_.__setLicense( license );
            success();
        }, function(response) {
            if (+response.status === 401) {
                localStorage.clear();
                Utils.reset();
                $location.path( '/' );
                document.location.reload();
                return;
            }
            this_.__updateErrorCallback( response );
            error( response );
        } );
        return this;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @param {string} licenseNumber Numero de la licence
     * @param {function} success Callback de succès
     * @param {function} error Callback d'erreur
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.register = function(licenseNumber, success, error) {
        var this_ = this,
            now = new Date();

        this.__getDeviceId( function(name, serial) {
            var license = {
                'serial': licenseNumber,
                'device_serial': serial,
                'device_name': name
            };

            G3lic.register( license, function(options) {
                license.registered = true;
                license.lastcheck = now;
                this_.__setRights( this_.__parseG3licResponse( options ) );
                this_.__setLicense( license );
                success( license );
            }, function(response) {
                if (response.status === 409) {
                    license.registered = true;
                    license.lastcheck = now;
                    this_.__setLicense( license );
                    this_.update( true, function() {
                        success( license );
                    }, function() {
                        (error || function() {}) ( response );
                    } );
                } else {
                    (error || function() {}) ( response );
                }
            } );
        } );


        return this;
    };

    /**
     * @method
     * @memberOf LicenseManager
     * @param {function} callback Callback appelé avec (name, serial)
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.__getDeviceId = function(callback) {

        if (window.SmartgeoChromium) {
            ChromiumCallbacks[666] = callback;
            SmartgeoChromium.getDeviceId();
        } else if (window.cordova) {
            cordova.exec( function(args) {
                callback( args[0], args[1] );
            }, function(error) {
                window.alert( error );
            }, "gotoPlugin", "getDeviceId", [] );
        } else {
            callback( 'name', 'xxxx' + Math.random() );
        }

        return this;
    };

    return new LicenseManager();

} );
