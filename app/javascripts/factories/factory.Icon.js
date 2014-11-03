(function() {

    'use strict';

    angular
        .module( 'smartgeomobile' )
        .factory( 'Icon', IconFactory );

    IconFactory.$inject = ["Site"];

    function IconFactory(Site) {

        /**
         * @class IconFactory
         * @desc Factory de la classe Icon
         */
        var Icon = {};

        /**
         * @name get
         * @desc Retourne l'icône
         * @param       {string} name Nom de l'icône
         * @returns     {L.icon} Icône correspondant
         */
        Icon.get = function(name) {
            var icon = Icon[name];
            if (icon) {
                return icon;
            } else {
                console.error( 'Icon ' + name + ' not available.' );
            }
        };

        /**
         * @name getOkeyIcon
         * @desc        Retourne l'icône associée à l'okey demandé
         * @param       {string} okey
         * @returns     {L.icon} Icône correspondant
         */
        Icon.getOkeyIcon = function(okey, classindex) {

            classindex = classindex || 0;

            var icon = Icon['OKEY_' + okey + '_' + classindex] || L.icon( {
                    iconUrl: Site.current.symbology['' + okey + classindex].style.symbol.icon,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                } );

            if (icon) {
                return icon;
            } else {
                console.error( 'Icon not available.' );
            }

        };

        Icon.SELECTED_MISSION = L.icon( {
            iconUrl: "images/SELECTED_MISSION.png",
            iconSize: [65, 89],
            iconAnchor: [32, 89]
        } );

        Icon.NON_SELECTED_MISSION = L.icon( {
            iconUrl: "images/NON_SELECTED_MISSION.png",
            iconSize: [49, 67],
            iconAnchor: [25, 67]
        } );

        Icon.NON_SELECTED_NIGHTTOUR = new L.DivIcon( {
            html: '',
            className: 'NON_SELECTED_NIGHTTOUR',
            iconSize: [49, 67],
            iconAnchor: [25, 67]
        } );

        Icon.DONE_MISSION = L.icon( {
            iconUrl: "images/DONE_MISSION.png",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        } );

        Icon.DONE_NIGHTTOUR = L.icon( {
            iconUrl: "images/DONE_NIGHTTOUR.png",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        } );

        Icon.CONSULTATION = L.icon( {
            iconUrl: "images/CONSULTATION.png",
            iconSize: [49, 67],
            iconAnchor: [25, 67]
        } );

        Icon.GRAY_TARGET = L.icon( {
            iconUrl: 'javascripts/vendors/images/target_gray.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        } );

        Icon.TARGET = L.icon( {
            iconUrl: 'javascripts/vendors/images/target.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        } );

        return Icon;
    }

})();
