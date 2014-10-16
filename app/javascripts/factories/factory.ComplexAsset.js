(function () {

    'use strict';

    angular
        .module('smartgeomobile')
        .factory('ComplexAsset', ComplexAssetFactory);

    ComplexAssetFactory.$inject = ["$q", "$rootScope", "$http", "G3ME", "Smartgeo", "Storage", "AssetFactory", "Site"];

    function ComplexAssetFactory($q, $rootScope, $http, G3ME, Smartgeo, Storage, AssetFactory, Site) {

        /**
         * @class ComplexAssetFactory
         * @desc Factory de la classe ComplexAsset
         */
        var ComplexAsset = function (okey, father, root) {
            this.okey = okey;
            this.uuid = Smartgeo.uuid();
            this.children = [];
            this.father = father && father.uuid;
            this.root = root || this;
            this.fields = {};
            this.fields[Site.current.metamodel[this.okey].ukey] = Site.current.metamodel[this.okey].label;

            if (!this.okey) {
                console.error('You must provide a root okey.');
                return false;
            }

            if (Site.current.dependancies[okey]) {
                this.add();
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
         */
        ComplexAsset.prototype.add = function () {

            var childType = Site.current.dependancies[this.okey];

            if (!childType) {
                console.error('This node type has no child type.');
                return false;
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
         *
         * @desc        Cherche le noeud correspondant à l'UUID en paramêtre
         */
        ComplexAsset.prototype.get = function (uuid) {

            if (!uuid) {
                console.error('You must provide node uuid.');
                return false;
            }
            if (this.uuid === uuid) {
                return this;
            }

            var found = false;

            for (var i = 0; i < this.children.length; i++) {
                found = found || this.children[i].get(uuid);
            }

            if (!this.father && !found) {
                console.error('Uuid ' + this.uuid + ' not found.');
                return false;
            } else {
                return found;
            }

        };

        /**
         * @method
         * @memberOf ComplexAsset
         *
         * @returns {ComplexAsset} Objet complexe créé
         *
         */
        ComplexAsset.prototype.duplicate = function () {

            if (!this.father) {
                console.error('You cannot duplicate root node.');
                return false;
            }

            var father = this.root.get(this.father);

            if (!father) {
                console.error('Father node ' + this.father + ' not found.');
                return false;
            }

            for (var i = 0; i < father.children.length; i++) {
                if (father.children[i].uuid === this.uuid) {
                    var newNode = father.children[i].__clone();
                    newNode.__updateUuid(father.uuid);
                    newNode.__closeTreeForm();
                    father.children.push(newNode);
                    return newNode;
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
         */
        ComplexAsset.prototype.delete = function () {

            if (!this.father) {
                console.error('You cannot remove root node.');
                return false;
            }

            var father = this.root.get(this.father);

            if (!father) {
                console.error('Father node ' + this.father + ' not found.');
                return false;
            }

            for (var i = 0; i < father.children.length; i++) {
                if (father.children[i].uuid === this.uuid) {
                    if (father.children[i].layer) {
                        father.children[i].layer._map.removeLayer(father.children[i].layer);
                        delete father.children[i].layer;
                    }
                    delete father.children[i];
                    father.children.splice(i, 1);
                    return true;
                }
            }
            return false;
        };

        /**
         * @method
         * @memberOf ComplexAsset
         */
        ComplexAsset.prototype.toggleForm = function () {
            var visibility = this.formVisible;
            this.root.__closeTreeForm();
            this.formVisible = !visibility;
        };

        /**
         * @method
         * @memberOf ComplexAsset
         */
        ComplexAsset.prototype.__closeTreeForm = function () {
            this.formVisible = false;
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
        ComplexAsset.prototype.save = function () {

            var node = this.__clone(true);
            node.timestamp = (new Date()).getTime();
            node.__clean();
            node.geometry = this.geometry;
            var deferred = $q.defer();

            Storage.get_('census', function (census) {
                census = census || [];
                census.push(node);
                Storage.set_('census', census, function () {
                    $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                    for (var i in G3ME.map._layers) {
                        if (G3ME.map._layers[i].redraw && !G3ME.map._layers[i]._url && G3ME.map._layers[i].isTemp) {
                            G3ME.map._layers[i].redraw();
                        }
                    }
                    $rootScope.refreshSyncCenter();
                    deferred.resolve();
                });
            });

            $http.post(Smartgeo.getServiceUrl('gi.maintenance.mobility.census.json'), node, {
                timeout: 100000
            }).success(function (data) {
                if (!Array.isArray(data) || !data[node.okey] || !data[node.okey].length) {
                    return;
                }
                for (var okey in data) {
                    for (var i = 0; i < data[okey].length; i++) {
                        AssetFactory.save(data[okey][i], Site.current);
                    }
                }
                Storage.get_('census', function (census) {
                    census = census || [];
                    var alreadySaved = false;
                    for (var i = 0; i < census.length; i++) {
                        if (census[i].uuid === node.uuid) {
                            alreadySaved = true;
                            break;
                        }
                    }
                    if (alreadySaved) {
                        census[i].synced = true;
                    } else {
                        node.synced = true;
                        census.push(node);
                    }

                    Storage.set_('census', census, function () {
                        $rootScope.$broadcast("REPORT_LOCAL_NUMBER_CHANGE");
                        for (var i in G3ME.map._layers) {
                            if (G3ME.map._layers[i].redraw && !G3ME.map._layers[i]._url) {
                                G3ME.map._layers[i].redraw();
                            }
                        }
                        $rootScope.refreshSyncCenter();
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
        ComplexAsset.prototype.__log = function () {
            console.groupCollapsed(Site.current.metamodel[this.okey].label + ':' + this.uuid);
            console.info(this);
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__log();
            }
            console.groupEnd();
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @param {integer} level
         * @private
         */
        ComplexAsset.prototype.__clone = function (preserveGeometry) {
            var root = this.root,
                layer = this.layer,
                geometry = this.geometry;

            if (!preserveGeometry) {
                this.__deleteGeometry();
            }
            this.__deleteLayer();
            this.__deleteRoot();

            var newNode = angular.copy(this);

            if (!preserveGeometry) {
                this.__restoreGeometry(geometry);
            }
            this.__restoreRoot(root);
            this.__restoreLayer(layer);

            newNode.__restoreRoot(root);
            return newNode;
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @private
         */
        ComplexAsset.prototype.__deleteRoot = function () {
            delete this.root;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__deleteRoot();
            }
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @private
         */
        ComplexAsset.prototype.__deleteGeometry = function () {
            delete this.geometry;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__deleteGeometry();
            }
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @private
         */
        ComplexAsset.prototype.__deleteLayer = function () {
            delete this.layer;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__deleteLayer();
            }
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @param {ComplexAsset} root
         * @private
         */
        ComplexAsset.prototype.__restoreGeometry = function (geometry) {
            this.geometry = geometry;
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @param {ComplexAsset} root
         * @private
         */
        ComplexAsset.prototype.__restoreLayer = function (layer) {
            this.layer = layer;
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @param {ComplexAsset} root
         * @private
         */
        ComplexAsset.prototype.__restoreRoot = function (root) {
            this.root = root;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__restoreRoot(root);
            }
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @private
         */
        ComplexAsset.prototype.__clean = function () {
            this.__deleteRoot();
            delete this.father;
            delete this.showForm;
            delete this.layer;
            delete this.formVisible;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__clean();
            }
            return this;
        };

        /**
         * @method
         * @memberOf ComplexAsset
         * @private
         */
        ComplexAsset.prototype.__updateUuid = function (father) {
            this.uuid = Smartgeo.uuid();
            this.father = father;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].__updateUuid(this.uuid);
            }
        };

        ComplexAsset.prototype.isGeometryOk = function () {
            if (Site.current.metamodel[this.okey].is_graphical && !this.geometry) {
                return false;
            } else if (!this.children.length) {
                return true;
            }

            var children = true;
            for (var i = 0; i < this.children.length; i++) {
                children = children && this.children[i].isGeometryOk();
            }
            return children;
        };
        return ComplexAsset;

    }

})();
