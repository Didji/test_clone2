var ComplexAssetTree = {
    "1": { child:    4},
    "2": { child: null},
    "4": { child: null},
    "5": { child: null},
    "7": { child:    5},
    "9": { child:    7}
};

angular.module('smartgeomobile').factory('ComplexAssetFactory', function ($http, Smartgeo, $q, $rootScope) {

    'use strict';

    /**
     * @class       ComplexAssetError
     *
     * @param {string} message Okey de l'objet complexe racine à créer.
     *
     * @property {string} name    Okey du noeud
     * @property {string} message Identifiant unique du noeud
     */
    function ComplexAssetError(message) {
        this.name = "ComplexAssetError";
        this.message = message || "Unhandled ComplexAssetError";
    }
    ComplexAssetError.prototype = new Error();
    ComplexAssetError.prototype.constructor = ComplexAssetError;


    /**
     * @class       ComplexAsset
     * @classdesc   Les objets complexes sont utilisés pour le recensement.
     *
     * @desc        Crée l'intégralité de l'arbre jusqu'à son dernier fils.
     *
     * @param       {string}        okey    Okey de l'objet complexe racine à créer.
     * @param       {ComplexAsset}  father  Noeud père
     *
     * @property    {string}        okey        Okey du noeud
     * @property    {string}        uuid        Identifiant unique du noeud
     * @property    {Array}         children    Liste des noeuds enfant
     * @property    {Object}        metamodel   Metamodel de l'okey concernée
     * @property    {ComplexAsset}  father      Noeud père
     *
     * @returns     {ComplexAsset} Objet complexe créé
     *
     * @throws      {ComplexAssetError} You must provide a root okey.
     */
    var ComplexAsset = function(okey, father){
        this.okey       = okey;
        this.uuid       = Smartgeo.uuid();
        this.children   = [];
        // this.father     = father;
        this.metamodel  = window.site.metamodel[this.okey];
        if (!this.okey) {
            throw new ComplexAssetError('You must provide a root okey.');
        }
        if (ComplexAssetTree[okey].child) {
            this.children.push(new ComplexAsset(ComplexAssetTree[okey].child, this));
        }
        return this;
    };

    /**
     * @method
     * @memberOf    ComplexAsset
     *
     * @param       {string} uuid
     * @param       {bool}   isRoot
     *
     * @returns     {ComplexAsset} Objet complexe créé
     *
     * @throws      {ComplexAssetError} You cannot duplicate root node.
     * @throws      {ComplexAssetError} This node type has no child type.
     * @throws      {ComplexAssetError} Uuid not found.
     *
     * @desc        Ajoute un noeud à l'uuid renseigné
     */
    ComplexAsset.prototype.addNode = function(uuid, isRoot) {

        if(isRoot !== false){
            isRoot = true ;
        }

        if(!uuid){
            throw new ComplexAssetError('You must provide node uuid.');
        }

        if(this.uuid === uuid && !ComplexAssetTree[this.okey].child){
            throw new ComplexAssetError('This node type has no child type.');
        } else if(this.uuid === uuid && ComplexAssetTree[this.okey].child){
            var newNode = new ComplexAsset(ComplexAssetTree[this.okey].child)
            this.children.push(newNode);
            return newNode ;
        }

        var found = false ;

        for (var i = 0; i < this.children.length; i++) {
            found = found || this.children[i].addNode(uuid, false);
        }

        if(isRoot && !found){
            throw new ComplexAssetError('Uuid not found.');
        } else {
            return found ;
        }

    };

    /**
     * @method
     * @memberOf ComplexAsset
     *
     * @param {string} uuid
     * @param {bool}   isRoot
     *
     * @returns {ComplexAsset} Objet complexe créé
     *
     * @throws {ComplexAssetError} You cannot duplicate root node.
     * @throws {ComplexAssetError} You must provide node uuid.
     * @throws {ComplexAssetError} Uuid not found.
     */
    ComplexAsset.prototype.duplicateNode = function(uuid, isRoot) {

        if(isRoot !== false){
            isRoot = true ;
        }

        if(isRoot && this.uuid === uuid){
            throw new ComplexAssetError('You cannot duplicate root node.');
        }

        if(!uuid){
            throw new ComplexAssetError('You must provide node uuid.');
        }

        for (var i = 0; i < this.children.length; i++) {
            if(this.children[i].uuid === uuid){
                var newNode = angular.copy(this.children[i]);
                newNode.__updateUuid();
                this.children.push(newNode);
                return true ;
            }
        }

        var duplicated = false ;

        for (i = 0; i < this.children.length; i++) {
            duplicated = duplicated || this.children[i].duplicateNode(uuid, false);
        }

        if(isRoot && !duplicated){
            throw new ComplexAssetError('Uuid not found.');
        } else {
            return duplicated ;
        }

    };


    /**
     * @method
     * @memberOf ComplexAsset
     *
     * @param {string} uuid
     * @param {bool}   isRoot
     *
     * @returns {Boolean} True si l'objet a été supprimé
     *
     * @throws {ComplexAssetError} You cannot remove root node.
     * @throws {ComplexAssetError} You must provide node uuid.
     * @throws {ComplexAssetError} Uuid not found.
     */
    ComplexAsset.prototype.deleteNode = function(uuid, isRoot) {

        if(isRoot !== false){
            isRoot = true ;
        }

        if(isRoot && this.uuid === uuid){
            throw new ComplexAssetError('You cannot remove root node.');
        }

        if(!uuid){
            throw new ComplexAssetError('You must provide node uuid.');
        }

        for (var i = 0; i < this.children.length; i++) {
            if(this.children[i].uuid === uuid){
                delete this.children[i];
                this.children.splice(i, 1);
                return true ;
            }
        }

        var deleted = false ;

        for (i = 0; i < this.children.length; i++) {
            deleted = deleted || this.children[i].deleteNode(uuid, false);
        }

        if(isRoot && !deleted){
            throw new ComplexAssetError('Uuid not found.');
        } else {
            return deleted ;
        }

    };

    /**
     * @method
     * @memberOf ComplexAsset
     * @param {integer} level
     * @private
     */
    ComplexAsset.prototype.__log = function() {
        console.groupCollapsed(this.metamodel.label + ':' + this.uuid);
        console.log(this);
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].__log();
        }
        console.groupEnd();
    }

    /**
     * @method
     * @memberOf ComplexAsset
     * @private
     */
    ComplexAsset.prototype.__updateUuid = function() {
        this.uuid = Smartgeo.uuid();
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].__updateUuid();
        }
    }

    return ComplexAsset;
});
