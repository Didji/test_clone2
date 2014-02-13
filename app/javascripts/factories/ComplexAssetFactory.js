var ComplexAssetTree = {
    "1": {
        child: 4
    },
    "2": {
        child: null
    },
    "4": {
        child: null
    },
    "5": {
        child: null
    },
    "7": {
        child: 5
    },
    "9": {
        child: 7
    }
};

angular.module('smartgeomobile').factory('ComplexAssetFactory', function ($http, Smartgeo, $q, $rootScope) {

    'use strict';

    /**
     * @class     ComplexAsset
     * @classdesc Les objets complexes sont utilisés pour le recensement.
     * @param     {string} okey Okey de l'objet complexe racine à créer.
     * @desc      Crée l'intégralité de l'arbre jusqu'à son dernier fils.
     * @property  {string} okey      Okey du noeud
     * @property  {string} uuid      Identifiant unique du noeud
     * @property  {Array}  children  Liste des noeuds enfant
     * @property  {Object} metamodel Metamodel de l'okey concernée
     * @returns   {ComplexAsset} Objet complexe créé
     * @throws    [ComplexAsset] You must provide a root okey.
     */
    var ComplexAsset = function(okey){
        this.okey = okey;
        this.uuid = Smartgeo.uuid();
        this.children = [];
        this.metamodel = site.metamodel[this.okey];
        if (!this.okey) {
            throw new Error('[ComplexAsset] You must provide a root okey.');
        }
        if (ComplexAssetTree[okey].child) {
            this.children.push(new ComplexAsset(ComplexAssetTree[okey].child));
        }
        return this;
    };

    /**
     * @method
     * @memberOf    ComplexAsset
     * @param       {string} uuid
     * @param       {bool}   isRoot
     * @returns     {ComplexAsset} Objet complexe créé
     * @throws      [ComplexAsset] You cannot duplicate root node.
     * @throws      [ComplexAsset] This node type has no child type.
     * @throws      [ComplexAsset] Uuid not found.
     * @desc        Ajoute un noeud à l'uuid renseigné
     */
    ComplexAsset.prototype.addNode = function(uuid, isRoot) {

        if(isRoot !== false){
            isRoot = true ;
        }

        if(!uuid){
            throw new Error('[ComplexAsset] You must provide node uuid.');
        }

        if(this.uuid === uuid && !ComplexAssetTree[this.okey].child){
            throw new Error('[ComplexAsset] This node type has no child type.');
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
            throw new Error('[ComplexAsset] Uuid not found.');
        } else {
            return found ;
        }

    };

    /**
     * @method
     * @memberOf ComplexAsset
     * @param {string} uuid
     * @param {bool}   isRoot
     * @returns {ComplexAsset} Objet complexe créé
     * @throws [ComplexAsset] You cannot duplicate root node.
     * @throws [ComplexAsset] You must provide node uuid.
     * @throws [ComplexAsset] Uuid not found.
     */
    ComplexAsset.prototype.duplicateNode = function(uuid, isRoot) {

        if(isRoot !== false){
            isRoot = true ;
        }

        if(isRoot && this.uuid === uuid){
            throw new Error('[ComplexAsset] You cannot duplicate root node.');
        }

        if(!uuid){
            throw new Error('[ComplexAsset] You must provide node uuid.');
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
            throw new Error('[ComplexAsset] Uuid not found.');
        } else {
            return duplicated ;
        }

    };


    /**
     * @method
     * @memberOf ComplexAsset
     * @param {string} uuid
     * @param {bool}   isRoot
     * @returns {Boolean} True si l'objet a été supprimé
     * @throws [ComplexAsset] You cannot remove root node.
     * @throws [ComplexAsset] You must provide node uuid.
     * @throws [ComplexAsset] Uuid not found.
     */
    ComplexAsset.prototype.deleteNode = function(uuid, isRoot) {

        if(isRoot !== false){
            isRoot = true ;
        }

        if(isRoot && this.uuid === uuid){
            throw new Error('[ComplexAsset] You cannot remove root node.');
        }

        if(!uuid){
            throw new Error('[ComplexAsset] You must provide node uuid.');
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
            throw new Error('[ComplexAsset] Uuid not found.');
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
        if(this.children.length){
            console.groupCollapsed(this.metamodel.label + ':' + this.uuid);
        } else {
            console.log(this.metamodel.label + ':' + this.uuid);
        }
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
