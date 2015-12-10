( function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .filter( 'prettifyField', prettifyField )
        .filter( 'decodeBool', decodeBool )
        .filter( 'consultationTabsFilter', consultationTabsFilter )
        .filter( 'consultationFieldsFilter', consultationFieldsFilter )
        .filter( 'reportTabsFilter', reportTabsFilter )
        .filter( 'reportFieldsFilter', reportFieldsFilter )
        .filter( 'activityListFilter', activityListFilter )
        .filter( 'reportableAssetsForIntentFilter', reportableAssetsForIntentFilter )
        .filter( 'isLink', isLink )
        .filter( 'updatableAssetsFilter', updatableAssetsFilter )
        .filter( 'guirlandeFilter', guirlandeFilter );

    function prettifyField() {
        /**
         * @name _prettifyField
         * @desc
         */
        function _prettifyField(s) {
            if ('string' !== typeof s) {
                return s;
            }
            return ((s + '') || '').replace( /\\n/g, '\n' );
        }
        return _prettifyField;
    }
    decodeBool.$inject = ["i18n"];
    function decodeBool(i18n) {
        /**
         * @name _decodeBool
         * @desc
         */
        function _decodeBool(s) {
            if (s === 'Y') {
                return i18n.get( '_BOOL_Y_' );
            }
            return i18n.get( '_BOOL_N_' );
        }
        return _decodeBool;
    }

    function consultationTabsFilter() {
        /**
         * @name _consultationTabsFilter
         * @desc
         */
        function _consultationTabsFilter(tabsIn, asset) {
            tabsIn = tabsIn || [];
            var tabsOut = [];
            for (var i = 0; i < tabsIn.length; i++) {
                for (var j = 0; j < tabsIn[i].fields.length; j++) {
                    var field = tabsIn[i].fields[j];
                    if (asset.attributes[field.key]) {
                        tabsIn[i].nonBlankField = (tabsIn[i].nonBlankField || 0) + 1;
                    }
                }
            }
            for (i = 0; i < tabsIn.length; i++) {
                if ( (tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0) ) {
                    tabsOut.push( tabsIn[i] );
                }
            }
            return tabsOut;
        }
        return _consultationTabsFilter;
    }

    consultationFieldsFilter.$inject = ["Site"];

    function consultationFieldsFilter(Site) {
        /**
         * @name _consultationFieldsFilter
         * @desc
         */
        function _consultationFieldsFilter(fieldsIn, asset) {
            var fieldsOut = [];
            for (var i = 0; i < fieldsIn.length; i++) {
                if (asset.attributes[fieldsIn[i].key] ||
                    (
                    fieldsIn[i].options &&
                    Site.current.lists &&
                    asset.attributes[fieldsIn[i].key] &&
                    Site.current.lists[fieldsIn[i].options] &&
                    Site.current.lists[fieldsIn[i].options][asset.attributes[fieldsIn[i].key]])
                ) {
                    fieldsOut.push( fieldsIn[i] );
                }
            }
            return fieldsOut;
        }
        return _consultationFieldsFilter;
    }

    function reportTabsFilter() {
        /**
         * @name _reportTabsFilter
         * @desc
         */
        function _reportTabsFilter(tabsIn, report) {
            var tabsOut = [];
            for (var i = 0; i < tabsIn.length; i++) {
                for (var j = 0; j < tabsIn[i].fields.length; j++) {
                    var field = tabsIn[i].fields[j];
                    if (report.fields[field.id]) {
                        tabsIn[i].nonBlankField = (tabsIn[i].nonBlankField || 0) + 1;
                    }
                }
            }
            for (i = 0; i < tabsIn.length; i++) {
                if ( (tabsIn[i].nonBlankField && tabsIn[i].nonBlankField > 0) ) {
                    tabsOut.push( tabsIn[i] );
                }
            }
            return tabsOut;
        }
        return _reportTabsFilter;
    }

    reportFieldsFilter.$inject = ["Site"];

    function reportFieldsFilter(Site) {
        /**
         * @name _reportFieldsFilter
         * @desc
         */
        function _reportFieldsFilter(fieldsIn, report) {
            var fieldsOut = [];
            for (var i = 0; i < fieldsIn.length; i++) {
                if (((report.fields[fieldsIn[i].id] ||
                    (
                    fieldsIn[i].options &&
                    Site.current.lists &&
                    report.fields[fieldsIn[i].id] &&
                    Site.current.lists[fieldsIn[i].options] &&
                    Site.current.lists[fieldsIn[i].options][report.fields[fieldsIn[i].id]])
                    )) &&
                    JSON.stringify( report.fields[fieldsIn[i].id] ) !== '{}'
                ) {
                    fieldsOut.push( fieldsIn[i] );
                }
            }
            return fieldsOut;
        }
        return _reportFieldsFilter;
    }

    activityListFilter.$inject = ["Site"];

    function activityListFilter(Site) {

        /**
         * @name _activityListFilter
         * @desc
         */
        function _activityListFilter(asset) {
            if (asset && asset.length) {
                asset = asset[0];
            } else if (!asset) {
                return [];
            }
            var activitiesOut = [];
            for (var i = 0; i < Site.current.activities.length; i++) {
                if (Site.current.activities[i].okeys[0] === asset.okey) {
                    activitiesOut.push( Site.current.activities[i] );
                }
            }
            return activitiesOut;
        }
        return _activityListFilter;
    }

    reportableAssetsForIntentFilter.$inject = ["Site", "Storage"];

    function reportableAssetsForIntentFilter(Site, Storage) {
        /**
         * @name _reportableAssetsForIntentFilter
         * @desc
         */
        function _reportableAssetsForIntentFilter(assets) {
            if ( assets && !( assets instanceof Array ) ) {
                assets = [assets];
            } else if ( !assets ) {
                return [];
            }

            var out = [];
            var intent = Storage.get( 'intent' );

            if ( !( intent && intent.map_target ) ) {
                return [];
            }

            for (var i = 0; i < assets.length; i++) {
                if ( Site.current.activities._byId[ intent.map_activity ].okeys[0] === assets[ i ].okey ) {
                    out.push( assets[ i ] );
                }
            }
            return out;
        }
        return _reportableAssetsForIntentFilter;
    }

    function isLink() {
        /**
         * @name _isLink
         * @desc
         */
        function _isLink(s) {
            return ((s + '') || '').search( /(https?:\/\/.*)$/ );
        }
        return _isLink;
    }


    function updatableAssetsFilter() {
        /**
         * @name _updatableAssetsFilter
         * @desc Retourne les assets modifiables parmi ceux passés en paramètre
         */
        function _updatableAssetsFilter(assets) {
            var out = [];
            for (var i = 0; i < assets.length; i++) {
                if (assets[i].attributes._rights === 'U') {
                    out.push( assets[i] );
                }
            }
            return out;
        }
        return _updatableAssetsFilter;
    }


    guirlandeFilter.$inject = ["Site", "Project", "$filter", "Right", "Storage"];

    function guirlandeFilter(Site, Project, $filter, Right, Storage) {
        /**
         * @name _guirlandeFilter
         * @desc Définie la liste des boutons dans un bloc de consultation en fonction d'un Asset
         */

        var actions = {

            // GEO ACTIONS
            "zoomon": {
                id: "zoomon",
                icon: "map-marker",
                method: "asset.zoomOn"
            },
            "goto": {
                id: "goto",
                icon: "location-arrow",
                method: "asset.goTo"
            },

            // MULTI SELECTION ACTIONS
            "addtoselection": {
                id: "addtoselection",
                icon: "shopping-cart",
                suffix: "plus",
                method: "scope.addToCurrentSelection"
            },
            "dropfromcurrentselection": {
                id: "dropfromcurrentselection",
                icon: "shopping-cart",
                suffix: "minus",
                method: "scope.dropFromCurrentSelection"
            },

            // OBJECT ACTIONS
            "edit": {
                id: "edit",
                icon: "pencil",
                method: "asset.toggleEdit"
            },
            "delete": {
                id: "delete",
                icon: "trash",
                method: "scope.deleteAsset"
            },
            "fetchhistory": {
                id: "fetchhistory",
                icon: "history",
                method: "asset.fetchHistory"
            },

            // INTENT ACTIONS
            "addtoreportforintent": {
                id: "addtoreportforintent",
                icon: "pencil-square-o",
                method: "scope.addToReportForIntent"
            },

            // PROJECT ACTIONS
            "markobjectasdeleteforproject": {
                id: "markobjectasdeleteforproject",
                icon: "trash",
                method: "scope.markObjectAsDeletedForCurrentProject",
                suffix: "wrench"
            },
            "editobjectforproject": {
                id: "editobjectforproject",
                icon: "pencil",
                method: "asset.toggleEdit",
                suffix: "wrench"
            },
            "addtocurrentproject": {
                id: "addtocurrentproject",
                icon: "plus",
                method: "scope.addToCurrentProject",
                suffix: "wrench"
            },
            "deleteobjectfromprojectandreleaseit": {
                id: "deleteobjectfromprojectandreleaseit",
                icon: "minus",
                method: "scope.removeFromProject",
                suffix: "wrench"
            },
            "separator": {
                separator: true
            }

        };

        function _guirlandeFilter(asset) {
            if (!asset) {
                return [];
            }
            var authAction = [],
                isProjectable = !!Project.currentLoadedProject && (!!Site.current.metamodel[asset.okey].is_project || !!Site.current.metamodel["PROJECT_" + asset.okey]),
                isInCurrentProject = (asset.okey.search( 'PROJECT_' ) === 0),
                isNotMarkedAsRemoved = (!Project.currentLoadedProject) || (Project.currentLoadedProject.deleted.indexOf( asset.guid ) === -1) && (asset.project_status !== "deleted"),
                isLocked = asset.locked || (Project.currentLoadedProject && Project.currentLoadedProject.hasAsset( asset )),
                isReportable = !!$filter( 'activityListFilter' )( asset ).length && !isLocked,
                isUpdatable = Right.isUpdatable( asset ) && !isLocked,
                isGraphical = Site.current.metamodel[asset.okey].is_graphical,
                isAvailableToFetchHistory = Right.get( 'history' ) && isReportable && !(asset.reports && asset.reports.length),
                isReportableForIntent = !!$filter( 'reportableAssetsForIntentFilter' )( asset ).length;

            if (isAvailableToFetchHistory) {
                authAction.push( actions.fetchhistory );
            }

            // GEO ACTIONS
            if (isGraphical) {
                authAction.push( actions.zoomon );
            }

            if (isGraphical && Right.get( 'goto' )) {
                authAction.push( actions.goto );
            }

            // INTENT ACTIONS
            if ( isReportableForIntent ) {
                authAction.push( actions.addtoreportforintent );
            }

            // OBJECT ACTIONS
            if (isUpdatable && !isInCurrentProject) {
                authAction.push( actions.separator );
                authAction.push( actions.edit );
                authAction.push( actions.delete );
            }

            // MULTI SELECTION ACTIONS
            if (isReportable && Right.get( 'multiselection' )) {
                authAction.push( asset.isInMultiselection ? actions.dropfromcurrentselection : actions.addtoselection );
            }

            // PROJECT ACTIONS
            if (isProjectable) {

                authAction.push( actions.separator );

                if (isInCurrentProject && isNotMarkedAsRemoved) {
                    authAction.push( actions.editobjectforproject );
                    authAction.push( actions.markobjectasdeleteforproject );
                }

                if (isInCurrentProject) {
                    authAction.push( actions.deleteobjectfromprojectandreleaseit );
                }

                if (!isInCurrentProject && !isLocked) {
                    authAction.push( actions.addtocurrentproject );
                }

            }

            return authAction;
        }
        return _guirlandeFilter;
    }

} )();
