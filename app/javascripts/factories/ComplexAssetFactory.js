angular.module('smartgeomobile').factory('ComplexAssetFactory', function ($http, Smartgeo, $q, $rootScope, Installer, AssetFactory) {

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
     * @property    {ComplexAsset}  father      Noeud père
     *
     * @returns     {ComplexAsset} Objet complexe créé
     *
     * @throws      {ComplexAssetError} You must provide a root okey.
     */
    var ComplexAsset = function(okey, father, root){
        this.okey       = okey;
        this.uuid       = Smartgeo.uuid();
        this.children   = [];
        this.father     = father && father.uuid;
        this.root       = root || this ;
        this.fields     = {};
        this.fields[window.site.metamodel[this.okey].ukey] = window.site.metamodel[this.okey].label

        if (!this.okey) {
            throw new ComplexAssetError('You must provide a root okey.');
        }

        if (window.site.dependancies[okey]) {
            this.add() ;
        }

        return this;
    };

    /**
     * @method
     * @memberOf    ComplexAsset
     * @desc        Ajoute un noeud à l'uuid renseigné
     *
     * @returns     {ComplexAsset} Objet complexe créé
     *
     * @throws      {ComplexAssetError} This node type has no child type.
     */
    ComplexAsset.prototype.add = function() {

        var childType = window.site.dependancies[this.okey] ;

        if(!childType){
            throw new ComplexAssetError('This node type has no child type.');
        } else {
            return this.children.push(new ComplexAsset(childType, this, this.root));
        }

    };


    /**
     * @method
     * @memberOf    ComplexAsset
     *
     * @param       {string} uuid
     *
     * @returns     {ComplexAsset} Objet correspondant à l'UUID
     *
     * @throws      {ComplexAssetError} Uuid not found.
     *
     * @desc        Cherche le noeud correspondant à l'UUID en paramêtre
     */
    ComplexAsset.prototype.get = function(uuid) {

        if(!uuid){
            throw new ComplexAssetError('You must provide node uuid.');
        }
        if(this.uuid === uuid){
            return this ;
        }

        var found = false ;

        for (var i = 0; i < this.children.length; i++) {
            found = found || this.children[i].get(uuid);
        }

        if(!this.father && !found){
            throw new ComplexAssetError('Uuid '+this.uuid+' not found.');
        } else {
            return found ;
        }

    };

    /**
     * @method
     * @memberOf ComplexAsset
     *
     * @returns {ComplexAsset} Objet complexe créé
     *
     * @throws {ComplexAssetError} You cannot duplicate root node.
     * @throws {ComplexAssetError} Father node not found.
     */
    ComplexAsset.prototype.duplicate = function() {

        if(!this.father){
            throw new ComplexAssetError('You cannot duplicate root node.');
        }

        var father = this.root.get(this.father);

        if(!father){
            throw new ComplexAssetError('Father node '+this.father+' not found.');
        }

        for (var i = 0; i < father.children.length; i++) {
            if(father.children[i].uuid === this.uuid){
                var newNode = father.children[i].__clone();
                newNode.__updateUuid(father.uuid);
                newNode.__closeTreeForm();
                father.children.push(newNode);
                return newNode ;
            }
        }

    };


    /**
     * @method
     * @memberOf ComplexAsset
     *
     * @param {string} uuid
     *
     * @returns {Boolean} True si l'objet a été supprimé
     *
     * @throws {ComplexAssetError} You cannot remove root node.
     * @throws {ComplexAssetError} Father node not found.
     */
    ComplexAsset.prototype.delete = function() {

        if(!this.father){
            throw new ComplexAssetError('You cannot remove root node.');
        }

        var father = this.root.get(this.father);

        if(!father){
            throw new ComplexAssetError('Father node '+this.father+' not found.');
        }

        for (var i = 0; i < father.children.length; i++) {
            if(father.children[i].uuid === this.uuid){
                if(father.children[i].layer){
                    father.children[i].layer._map.removeLayer(father.children[i].layer);
                    delete father.children[i].layer;
                }
                delete father.children[i];
                father.children.splice(i, 1);
                return true ;
            }
        }
        return false ;
    };

    /**
     * @method
     * @memberOf ComplexAsset
     */
    ComplexAsset.prototype.toggleForm = function() {
        var visibility = this.formVisible ;
        this.root.__closeTreeForm();
        this.formVisible = !visibility;
    };

    /**
     * @method
     * @memberOf ComplexAsset
     */
    ComplexAsset.prototype.__closeTreeForm = function() {
        this.formVisible = false ;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].__closeTreeForm();
        }
    };

    /**
     * @method
     * @memberOf ComplexAsset
     *
     * @returns {Boolean} True si l'objet a été supprimé
     */
    ComplexAsset.prototype.save = function() {
        var node = this.__clone(true);
        node.__clean();
        node.geometry = this.geometry ;
        var deferred = $q.defer();
        $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.census.json'), node, {
            timeout: 100000
        }).success(function (data) {
            var assets = [] ;

            for(var okey in data){
                for (var i = 0; i < data[okey].length; i++) {
                    AssetFactory.save(data[okey][i]);
                }
            }
            deferred.notify();
            deferred.resolve();
        }).error(function () {
            Smartgeo.get_('census', function (census) {
                census = census || [];
                census.push(node);
                Smartgeo.set_('census', census, function () {
                    $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                    deferred.notify();
                    deferred.resolve();
                });
            });
        });
        return deferred.promise;
    };


    /**
     * @method
     * @memberOf ComplexAsset
     * @param {integer} level
     * @private
     */
    ComplexAsset.prototype.__log = function() {
        console.groupCollapsed(window.site.metamodel[this.okey].label + ':' + this.uuid);
        console.log(this);
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].__log();
        }
        console.groupEnd();
    }

    /**
     * @method
     * @memberOf ComplexAsset
     * @param {integer} level
     * @private
     */
    ComplexAsset.prototype.__clone = function(preserveGeometry) {
        var root     = this.root,
            layer    = this.layer,
            geometry = this.geometry ;

        if(!preserveGeometry){
            this.__deleteGeometry();
        }
        this.__deleteLayer();
        this.__deleteRoot();

        var newNode = angular.copy(this);

        if(!preserveGeometry){
            this.__restoreGeometry(geometry);
        }
        this.__restoreRoot(root);
        this.__restoreLayer(layer);

        newNode.__restoreRoot(root);
        return newNode ;
    }

   /**
     * @method
     * @memberOf ComplexAsset
     * @private
     */
    ComplexAsset.prototype.__deleteRoot = function() {
        delete this.root;
        for(var i = 0 ; i < this.children.length ; i++){
            this.children[i].__deleteRoot();
        }
    }

   /**
     * @method
     * @memberOf ComplexAsset
     * @private
     */
    ComplexAsset.prototype.__deleteGeometry = function() {
        delete this.geometry;
        for(var i = 0 ; i < this.children.length ; i++){
            this.children[i].__deleteGeometry();
        }
    }

   /**
     * @method
     * @memberOf ComplexAsset
     * @private
     */
    ComplexAsset.prototype.__deleteLayer = function() {
        delete this.layer;
        for(var i = 0 ; i < this.children.length ; i++){
            this.children[i].__deleteLayer();
        }
    }

   /**
     * @method
     * @memberOf ComplexAsset
     * @param {ComplexAsset} root
     * @private
     */
    ComplexAsset.prototype.__restoreGeometry = function(geometry) {
        this.geometry = geometry ;
    }

   /**
     * @method
     * @memberOf ComplexAsset
     * @param {ComplexAsset} root
     * @private
     */
    ComplexAsset.prototype.__restoreLayer = function(layer) {
        this.layer = layer ;
    }

   /**
     * @method
     * @memberOf ComplexAsset
     * @param {ComplexAsset} root
     * @private
     */
    ComplexAsset.prototype.__restoreRoot = function(root) {
        this.root = root ;
        for(var i = 0 ; i < this.children.length ; i++){
            this.children[i].__restoreRoot(root);
        }
    }

    /**
     * @method
     * @memberOf ComplexAsset
     * @private
     */
    ComplexAsset.prototype.__clean = function() {
        this.__deleteRoot();
        delete this.father ;
        delete this.showForm;
        delete this.layer;
        delete this.formVisible;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].__clean();
        }
        return this ;
    }

    /**
     * @method
     * @memberOf ComplexAsset
     * @private
     */
    ComplexAsset.prototype.__updateUuid = function(father) {
        this.uuid = Smartgeo.uuid();
        this.father = father ;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].__updateUuid(this.uuid);
        }
    }

    ComplexAsset.prototype.isGeometryOk = function(){
        if(window.site.metamodel[this.okey].is_graphical && !this.geometry){
            return false;
        } else if(!this.children.length){
            return true;
        }

        var children = true ;
        for (var i = 0; i < this.children.length; i++) {
            children = children && this.children[i].isGeometryOk() ;
        }
        return children;
    }
    return ComplexAsset;
});
