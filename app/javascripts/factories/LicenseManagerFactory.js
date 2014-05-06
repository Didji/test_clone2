angular.module('smartgeomobile').factory('LicenseManager', function ($http, $location, $rootScope) {

    'use strict';

    /**
     * @class LicenseManager
     * @property {object} rights Droits (ou options) accordés au terminal
     * @desc L'objet LicenseManager est un singleton, il vérifie à son instanciation que le terminal est enregistré.
     *       Si ce n'est pas le cas, il redirige l'utilisateur sur la page d'enregistrement
     */
    var LicenseManager = function(){
        if(!this.__isDeviceRegistered()){
            return $location.path('register');
        }
        this.__rights = this.__getRights();
        return this.update();
    };

    /**
     * @memberOf LicenseManager
     * @member {string} __g3lic
     * @static
     * @desc URL du serveur G3LIC
     * @example LicenseManager.prototype.__g3lic = "http://localhost:3000"
     */
    LicenseManager.prototype.__g3lic = "http://localhost:3000" ;

    /**
     * @memberOf LicenseManager
     * @member {object} __rights
     * @desc Droits accordés par g3lic
     * @example LicenseManager.prototype.__rights =  {
     *        "consultation" : true ,
     *        "server"       : "beta.smartgeo.fr" ,
     * }
     */
    LicenseManager.prototype.__rights = {} ;

    /**
     * @method
     * @memberOf LicenseManager
     * @returns {boolean} Validité de la licence
     * @desc Retourne "true" si le terminal a une licence, "false sinon"
     */
    LicenseManager.prototype.__isDeviceRegistered = function() {
        return (JSON.parse(localStorage['LicenseManager.license'] || "{}").registered === true) ;
    }

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
            rights[options[i].code] = (options[i].value === "undefined" ? true : options[i].value) ;
        }
        return rights;
    }

    /**
     * @method
     * @memberOf LicenseManager
     * @param {object} rights Droits à enregistrer
     * @desc Enregistre les droits passés en paramètres et met à jour le $rootScope pour être exploité
     *       depuis n'importe ou.
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.__setRights = function(rights) {
        localStorage['LicenseManager.rights'] = JSON.stringify(rights || {});
        $rootScope.rights = this.__rights = rights ;
        if (!$rootScope.$$phase) {
            $rootScope.$apply();
        }
        return this ;
    }

    /**
     * @method
     * @memberOf LicenseManager
     * @returns {object} Droits stockés dans le terminal
     * @desc Retourne les droits stockés dans le terminal
     */
    LicenseManager.prototype.__getRights = function() {
        return JSON.parse(localStorage['LicenseManager.rights'] || "{}" );
    }

    /**
     * @method
     * @memberOf LicenseManager
     * @param {object} license Licence à enregistrer
     * @desc Enregistre la licence passée en paramètres dans le terminal
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.__setLicense = function(license) {
        localStorage['LicenseManager.license'] = JSON.stringify(license || {});
        return this ;
    }

    /**
     * @method
     * @memberOf LicenseManager
     * @desc Retourne la licence stockée dans le terminal
     * @returns {object} Licence stockée dans le terminal
     */
    LicenseManager.prototype.__getLicense = function() {
        return JSON.parse(localStorage['LicenseManager.license'] || "{}") ;
    }

    /**
     * @method
     * @memberOf LicenseManager
     * @desc Vérifie la validité de la licence, et redirige ou non l'utilisateur en conséquence
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.update = function() {
        var this_ = this, license = this.__getLicense();
        $http.post( this.__g3lic + "/licenses/check", license ).success(function(options, status){
            license.registered = true;
            this_.__setRights(this_.__parseG3licResponse(options));
            this_.__setLicense(license);
        }).error(function(data, status){
            switch (status) {
            case 0:
                // on incrémente un compteur jusqu'a un seuil puis boom
                break;
            case 404:
                // TODO: return something more explicit from g3lic (like 403) (@gulian)
                $location.path('licenseRevoked');
                break;
            default:
                console.error(data, status);
                break;
            }
        });
        return this ;
    }

    /**
     * @method
     * @memberOf LicenseManager
     * @param {string} licenseNumber Numero de la licence
     * @param {string} deviceName Nom du terminal
     * @param {function} success Callback de succès
     * @param {function} error Callback d'erreur
     * @returns {LicenseManager} LicenseManager
     */
    LicenseManager.prototype.register = function(licenseNumber, deviceName, success, error) {
        var this_   = this;
        var license = {
            'serial'        : licenseNumber,
            'device_serial' : 'xxxx:xxxx:xxxx:xxxx'+Math.random(), // TEMP
            'device_name'   : deviceName
        };
        $http.post( this.__g3lic + "/licenses/register", license ).success(function(options, status){
            license.registered = true;
            this_.__setRights(this_.__parseG3licResponse(options));
            this_.__setLicense(license);
            success();
        }).error(error);
        return this;
    }

    return new LicenseManager();

});
