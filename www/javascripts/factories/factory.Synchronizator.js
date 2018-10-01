(function() {
    "use strict";

    angular.module("smartgeomobile").factory("Synchronizator", SynchronizatorFactory);

    SynchronizatorFactory.$inject = [
        "Site",
        "$http",
        "$rootScope",
        "G3ME",
        "SQLite",
        "Asset",
        "i18n",
        "Relationship",
        "Utils",
        "Storage"
    ];

    function SynchronizatorFactory(Site, $http, $rootScope, G3ME, SQLite, Asset, i18n, Relationship, Utils, Storage) {
        /**
         * @class SyncItemFactory
         * @desc Factory de la classe SyncItem
         */

        function SyncItem(syncitem, action) {
            angular.extend(
                this,
                {
                    label:
                        (syncitem.getLabel && syncitem.getLabel()) ||
                        syncitem.label ||
                        this.type ||
                        syncitem.type ||
                        syncitem.constructor.name,
                    description: (syncitem.getDescription && syncitem.getDescription()) || syncitem.description || "",
                    type: syncitem.constructor.name,
                    action: action,
                    id: syncitem.id || syncitem.uuid
                },
                syncitem
            );
        }

        SyncItem.prototype.id = undefined;
        SyncItem.prototype.json = undefined;
        SyncItem.prototype.type = undefined;
        SyncItem.prototype.action = undefined;
        SyncItem.prototype.deleted = false;
        SyncItem.prototype.synced = false;

        SyncItem.database = "parameters";
        SyncItem.table = "SYNCITEM";
        SyncItem.columns = ["id", "json", "type", "action", "deleted", "synced"];
        SyncItem.prepareStatement = SyncItem.columns.join(",").replace(/[a-z]+/gi, "?");

        /**
         * @name save
         * @desc
         */
        SyncItem.prototype.save = function(callback) {
            SQLite.exec(
                SyncItem.database,
                "INSERT OR REPLACE INTO " +
                    SyncItem.table +
                    "(" +
                    SyncItem.columns.join(",") +
                    ") VALUES (" +
                    SyncItem.prepareStatement +
                    ")",
                this.serializeForSQL(),
                function() {
                    $rootScope.$broadcast("synchronizator_update");
                    G3ME.reloadLayers();
                    (callback || function() {})();
                }
            );
        };

        /**
         * @name delete
         * @desc
         */
        SyncItem.prototype.delete = function() {
            var item = this;
            (SyncItem["delete" + item.type] ||
                function(item, callback) {
                    (callback || function() {})();
                })(item, function() {
                item.deleted = true;
                item.save();
            });
        };

        /**
         * @name serializeForSQL
         * @desc
         */
        SyncItem.prototype.serializeForSQL = function() {
            delete this.relatedAssets;
            delete this.consultationMarker;
            return [this.id, JSON.stringify(this), this.type, this.action, this.deleted, this.synced];
        };

        /**
         * @name JSONify
         * @desc
         */
        SyncItem.prototype.JSONify = function() {
            delete this.relatedAssets;
            delete this.consultationMarker;
            return JSON.stringify(this);
        };

        /**
         * @name checkChildGeom
         * @desc
         */
        SyncItem.prototype.checkChildGeom = function(object, geometry) {
            var allGeoms = [];
            if (!object) {
                if (this.children.length > 0) {
                    for (var child in this.children) {
                        allGeoms.push(this.checkChildGeom(this.children[child], this.geometry));
                    }
                    // on récupère le barycentre si l'objet racine n'a pas de geometrie
                    this.geometry == null ? (this.geometry = this.getBarycentre(allGeoms)) : null;
                }
                return this.geometry;
            } else {
                // on vérifie que l'objet a une geometrie, si non et que le paramètre geometry
                // n'est pas vide, on le set
                geometry && object.geometry == null ? (object.geometry = geometry) : null;
                if (object.children.length > 0) {
                    // on récupère ou applique les geometries de ou à tous les enfants
                    for (var child in object.children) {
                        allGeoms.push(this.checkChildGeom(object.children[child], object.geometry));
                    }
                    // on récupère le barycentre si l'objet n'a toujours pas de geometrie
                    object.geometry == null ? (object.geometry = this.getBarycentre(allGeoms)) : null;
                }
                // on retourne la géometrie pour que les parents qui n'avaient pas de geometrie
                // puissent en avoir une aussi.
                return object.geometry;
            }
        };

        /**
         * @name getBarycentre
         * @desc
         */
        SyncItem.prototype.getBarycentre = function(object) {
            var barycentre = [0, 0];
            var geom;
            for (var i = 0; i < object.length; i++) {
                geom = object[i];
                barycentre[0] += geom[0];
                barycentre[1] += geom[1];
            }
            barycentre[0] /= object.length;
            barycentre[1] /= object.length;
            return barycentre;
        };
        /**
         * @name list
         * @desc
         */
        SyncItem.list = function(wheres, callback) {
            SQLite.exec(
                SyncItem.database,
                "SELECT * FROM " + SyncItem.table + SyncItem.buildListWhere(wheres),
                [],
                function(rows) {
                    var syncItems = [],
                        syncItem;
                    for (var i = 0; i < rows.length; i++) {
                        syncItem = new SyncItem(rows.item(i));
                        syncItem = angular.extend(syncItem, JSON.parse(syncItem.json));
                        syncItem.deleted = syncItem.deleted === "true";
                        syncItem.synced = syncItem.synced === "true";
                        delete syncItem.json;
                        syncItems.push(syncItem);
                    }
                    (callback || function() {})(syncItems);
                }
            );
        };

        /**
         * @name buildListWhere
         * @desc
         */
        SyncItem.buildListWhere = function(wheres) {
            if (!wheres.length) {
                return "";
            }
            var where = " where ";
            for (var i = 0; i < wheres.length; i++) {
                where += wheres[i].column + " " + wheres[i].operator + ' "' + wheres[i].value + '" and ';
            }
            return where.slice(0, -4);
        };

        /**
         * @name listSynced
         * @desc
         */
        SyncItem.listSynced = function(callback) {
            var wheres = [
                {
                    column: "deleted",
                    operator: "!=",
                    value: "true"
                },
                {
                    column: "synced",
                    operator: "==",
                    value: "true"
                }
            ];
            SyncItem.list(wheres, callback);
        };

        /**
         * @name listSynced
         * @desc
         */
        SyncItem.listNotSynced = function(callback) {
            var wheres = [
                {
                    column: "deleted",
                    operator: "!=",
                    value: "true"
                },
                {
                    column: "synced",
                    operator: "!=",
                    value: "true"
                }
            ];
            SyncItem.list(wheres, callback);
        };

        /**
         * @name listSynced
         * @desc
         */
        SyncItem.listWithoutProject = function(callback) {
            var wheres = [
                {
                    column: "action",
                    operator: "NOT LIKE",
                    value: "project_%"
                },
                {
                    column: "synced",
                    operator: "!=",
                    value: "true"
                },
                {
                    column: "deleted",
                    operator: "!=",
                    value: "true"
                }
            ];
            SyncItem.list(wheres, callback);
        };

        SQLite.exec(
            SyncItem.database,
            "CREATE TABLE IF NOT EXISTS " +
                SyncItem.table +
                "(" +
                SyncItem.columns.join(",").replace("id", "id unique") +
                ")"
        );

        /**
         * @class Synchronizator
         * @desc Factory de la classe Synchronizator
         */
        function Synchronizator() {}

        Synchronizator.globalSyncInProgress = false;

        /**
         * @name add
         * @desc
         */
        Synchronizator.add = function(action, object) {
            var syncItem = new SyncItem(object, action);

            Synchronizator.log(syncItem);
            syncItem.save(function() {
                if (action === "update") {
                    $rootScope.$broadcast("syncUpdateList");
                }
                $rootScope.$broadcast("synchronizator_new_item");
            });
        };

        /**
         * @name addNew
         * @desc
         */
        Synchronizator.addNew = function(object) {
            Synchronizator.add("new", object);
        };

        /**
         * @name addDeleted
         * @desc
         */
        Synchronizator.addDeleted = function(object) {
            Synchronizator.add("delete", object);
        };

        /**
         * @name addUpdated
         * @desc
         */
        Synchronizator.addUpdated = function(object) {
            Synchronizator.add("update", object);
        };

        /**
         * @name listItems
         * @desc
         */
        Synchronizator.listItems = function(callback) {
            SyncItem.listNotSynced(callback);
        };

        /**
         * @name listItems
         * @desc
         */
        Synchronizator.listSyncedItems = function(callback) {
            SyncItem.listSynced(callback);
        };

        /**
         * @name listItems
         * @desc
         */
        Synchronizator.listItemsNotInProject = function(callback) {
            SyncItem.listWithoutProject(callback);
        };

        /**
         * @name syncItems
         * @desc
         */
        Synchronizator.syncItems = function(items, callback, force) {
            if (Synchronizator.globalSyncInProgress && !force) {
                return;
            }

            Synchronizator.globalSyncInProgress = true;

            if (items.length === undefined) {
                items = [items];
            }

            if (!items.length) {
                if (Synchronizator.needRefresh) {
                    G3ME.reloadLayers();
                    delete Synchronizator.needRefresh;
                }
                Synchronizator.globalSyncInProgress = false;
                return (callback || function() {})();
            }
            if (!Synchronizator[items[0].action + items[0].type + "Synchronizator"]) {
                return Synchronizator.syncItems(items.slice(1), callback, true);
            }

            // Construction dynamique du nom de la fonction à appeler (ex : "new"+"Report"+"Synchronizator")
            Synchronizator[items[0].action + items[0].type + "Synchronizator"](items[0], function() {
                // On ajoute un timeout pour fluidifier l'envoi des JSON
                setTimeout(function() {
                    Synchronizator.syncItems(items.slice(1), callback, true);
                }, 200);
            });
        };

        /**
         * @name deleteItem
         * @desc
         */
        Synchronizator.deleteItem = function(item) {
            item.delete();
        };

        /**
         * @name newComplexAssetSynchronizator
         * @desc
         */
        Synchronizator.newComplexAssetSynchronizator = function(complexasset, callback) {
            var assets = [];
            complexasset.syncInProgress = true;
            complexasset.checkChildGeom();
            $http
                .post(Utils.getServiceUrl("gi.maintenance.mobility.census.json"), complexasset, {
                    timeout: 1e5
                })
                .success(function(data) {
                    if (data instanceof Object) {
                        complexasset.synced = true;
                        var i;
                        for (var okey in data) {
                            if (okey === "relationship") {
                                continue;
                            }
                            for (i = 0; i < data[okey].length; i++) {
                                assets.push(data[okey][i]);
                            }
                        }
                        Asset.delete(complexasset.uuids, function() {
                            Relationship.delete(complexasset.uuids, function() {
                                Asset.save(assets, function() {
                                    Relationship.save(data.relationship, function() {
                                        complexasset.syncInProgress = false;
                                        Synchronizator.needRefresh = true;
                                        complexasset.save(callback);
                                    });
                                });
                            });
                        });
                    } else {
                        complexasset.error = i18n.get("_SYNC_UNKNOWN_ERROR_");
                        (callback || function() {})();
                    }
                })
                .error(function(data, code) {
                    if (+code === 404) {
                        complexasset.synced = true;
                        complexasset.syncInProgress = false;
                        complexasset.save(callback);
                        alertify.alert(i18n.get("_SYNC_UPDATE_HAS_BEEN_DELETED"));
                        Asset.delete(Asset.getIds(complexasset));
                    } else {
                        complexasset.error = data && data.error && data.error.text;
                    }
                    complexasset.syncInProgress = false;
                    complexasset.save(callback);
                });
        };

        /**
         * @name updateComplexAssetSynchronizator
         * @desc
         */
        Synchronizator.updateComplexAssetSynchronizator = function(complexasset, callback) {
            Synchronizator.newComplexAssetSynchronizator(complexasset, callback);
        };

        /**
         * @name deleteAssetSynchronizator
         * @desc
         */
        Synchronizator.deleteAssetSynchronizator = function(asset, callback) {
            asset.syncInProgress = true;
            $http
                .post(Utils.getServiceUrl("gi.maintenance.mobility.installation.assets.json"), {
                    deleted: asset.payload
                })
                .success(function(data) {
                    if (Asset.handleDeleteAssets(data)) {
                        asset.synced = true;
                        Synchronizator.needRefresh = true;
                        asset.save();
                    }
                })
                .error(function(data) {
                    Asset.handleDeleteAssets(data);
                })
                .finally(function() {
                    asset.syncInProgress = false;
                    (callback || function() {})();
                });
        };

        /**
         * @name newReportSynchronizator
         * @desc
         */
        Synchronizator.newReportSynchronizator = function(report, callback) {
            report.syncInProgress = true;
            $http
                .post(Utils.getServiceUrl("gi.maintenance.mobility.report.json"), report)
                .then(function(resp) {
                    if (resp.data.cri && resp.data.cri.length) {
                        report.synced = true;
                        report.error = undefined;
                    } else {
                        report.error = i18n.get("_SYNC_UNKNOWN_ERROR_");
                    }
                })
                .catch(function(data) {
                    switch (data.status) {
                        case 401:
                            report.error = i18n.get("_SYNC_ERROR_NOT_ALLOWED");
                            break;
                        case 403:
                            report.error = i18n.get("_SYNC_ERROR_NOT_AUTH");
                            break;
                        case 404:
                            report.error = i18n.get("_SYNC_ERROR_NOT_FOUND");
                            break;
                        case 500:
                            report.error = i18n.get("_SYNC_ERROR_SERVER");
                            break;
                        case 504:
                            report.error = i18n.get("_SYNC_ERROR_TIMEOUT");
                            break;
                        case 503:
                            report.error = i18n.get("_SYNC_ERROR_SERVER_UNAVAILABLE");
                            break;
                        default:
                            report.error = i18n.get("_SYNC_UNKNOWN_ERROR_");
                            break;
                    }
                })
                .finally(function() {
                    report.syncInProgress = false;
                    report.save(callback);
                });
        };

        /**
         * @name updateReportSynchronizator
         * @desc
         */
        Synchronizator.updateReportSynchronizator = function(report, callback) {
            Synchronizator.newReportSynchronizator(report, callback);
        };

        /**
         * @name deleteAll
         * @desc
         */
        Synchronizator.deleteAll = function(type, actions, callback) {
            Synchronizator.listItems(function(items) {
                for (var i = 0, ii = items.length; i < ii; i++) {
                    if (
                        (type ? items[i].type === type : true) &&
                        (actions ? actions.indexOf(items[i].action) !== -1 : true)
                    ) {
                        Synchronizator.deleteItem(items[i]);
                    }
                }
                (callback || function() {})();
            });
        };

        /**
         * @name deleteAllProjectItems
         * @desc
         */
        Synchronizator.deleteAllProjectItems = function(callback) {
            Synchronizator.deleteAll(null, ["project_new", "project_update"], callback);
        };

        /**
         * @name getAll
         * @desc
         */
        Synchronizator.getAll = function(type, action, callback) {
            Synchronizator.listItems(function(items) {
                var typedItems = [];
                for (var i = 0, ii = items.length; i < ii; i++) {
                    if ((type ? items[i].type === type : true) && (action ? items[i].action === action : true)) {
                        typedItems.push(items[i]);
                    }
                }
                (callback || function() {})(typedItems);
            });
        };

        /**
         * @name getAllByType
         * @desc
         */
        Synchronizator.getAllByType = function(type, callback) {
            Synchronizator.getAll(type, null, callback);
        };

        /**
         * @name getAllByAction
         * @desc
         */
        Synchronizator.getAllByAction = function(action, callback) {
            Synchronizator.getAll(null, action, callback);
        };

        /**
         * @name getAll
         * @desc
         */
        Synchronizator.getAllSynced = function(type, callback) {
            Synchronizator.listSyncedItems(function(items) {
                var typedItems = [];
                for (var i = 0, ii = items.length; i < ii; i++) {
                    if (items[i].type === type) {
                        typedItems.push(items[i]);
                    }
                }
                (callback || function() {})(typedItems);
            });
        };

        /**
         * @name log
         * @desc
         */
        Synchronizator.log = function(report) {
            var reportbis = angular.copy(report);

            if (reportbis.ged) {
                delete reportbis.ged;
            }
            if (window.cordova) {
                var fileName = reportbis.uuid || reportbis.id + ".json";
                window.resolveLocalFileSystemURL(
                    "file:///storage/extSdCard/Android/data/com.gismartware.mobile/cache/",
                    function(dir) {
                        dir.getDirectory("reports", { create: true }, function(reportDir) {
                            reportDir.getFile(fileName, { create: true }, function(file) {
                                if (!file) {
                                    return;
                                }
                                file.createWriter(
                                    function(fileWriter) {
                                        fileWriter.seek(fileWriter.length);
                                        fileWriter.write(JSON.stringify(reportbis));
                                    },
                                    function(error) {
                                        console.error(JSON.stringify(error));
                                    }
                                );
                            });
                        });
                    },
                    function(err) {
                        window.resolveLocalFileSystemURL(
                            cordova.file.externalCacheDirectory,
                            function(dir) {
                                dir.getDirectory("reports", { create: true }, function(reportDir) {
                                    reportDir.getFile(fileName, { create: true }, function(file) {
                                        if (!file) {
                                            return;
                                        }
                                        file.createWriter(
                                            function(fileWriter) {
                                                fileWriter.seek(fileWriter.length);
                                                fileWriter.write(JSON.stringify(reportbis));
                                            },
                                            function(error) {
                                                console.error(JSON.stringify(error));
                                            }
                                        );
                                    });
                                });
                            },
                            function(error) {
                                console.error(JSON.stringify(error));
                            }
                        );
                    }
                );
                return this;
            } else {
                return;
            }
        };

        /**
         * @name checkSynchronizedReports
         * @desc
         */
        Synchronizator.checkSynchronizedReports = function() {
            Synchronizator.getAllSynced("Report", function(reports) {
                var luuids = [];
                for (var i = 0; i < reports.length; i++) {
                    luuids.push(reports[i].uuid);
                }
                $http
                    .post(Utils.getServiceUrl("gi.maintenance.mobility.report.check.json"), {
                        uuids: luuids
                    })
                    .then(function(resp) {
                        if (typeof resp.data === "string") {
                            return;
                        }
                        var ruuids = resp.data.uuids || resp.data;
                        for (var i = 0, ii = reports.length; i < ii; i++) {
                            if (ruuids[reports[i].uuid]) {
                                reports[i].delete();
                            }
                        }
                    })
                    .catch(function(resp) {
                        switch (resp.status) {
                            case 401:
                                alertify.error(i18n.get("_SYNC_ERROR_NOT_ALLOWED"));
                                break;
                            case 403:
                                alertify.error(i18n.get("_SYNC_ERROR_NOT_AUTH"));
                                break;
                            case 404:
                                alertify.error(i18n.get("_SYNC_ERROR_NOT_FOUND"));
                                break;
                            case 500:
                                alertify.error(i18n.get("_SYNC_ERROR_SERVER"));
                                break;
                            case 504:
                                alertify.error(i18n.get("_SYNC_ERROR_TIMEOUT"));
                                break;
                            case 503:
                                alertify.error(i18n.get("_SYNC_ERROR_SERVER_UNAVAILABLE"));
                                break;
                            default:
                                alertify.error(i18n.get("_SYNC_UNKNOWN_ERROR_"));
                                break;
                        }
                    });
            });
        };

        return Synchronizator;
    }
})();
