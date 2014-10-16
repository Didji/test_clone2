angular.module('smartgeomobile').factory('Icon', function () {

    'use strict';

    /**
     * @class       Icon
     * @classdesc   Factory d'Icon
     *
     * @desc        Met en cache les icons.
     *
     * @property    {L.icon} SELECTED_MISSION
     * @property    {L.icon} NON_SELECTED_MISSION
     * @property    {L.icon} NON_SELECTED_NIGHTTOUR
     * @property    {L.icon} DONE_MISSION
     * @property    {L.icon} DONE_NIGHTTOUR
     * @property    {L.icon} CONSULTATION
     * @property    {L.icon} GRAY_TARGET
     * @property    {L.icon} TARGET
     */
    var Icon = function () {
        this.SELECTED_MISSION = L.icon({
            iconUrl: "images/SELECTED_MISSION.png",
            iconSize: [65, 89],
            iconAnchor: [32, 89],
        });
        this.NON_SELECTED_MISSION = L.icon({
            iconUrl: "images/NON_SELECTED_MISSION.png",
            iconSize: [49, 67],
            iconAnchor: [25, 67],
        });

        this.NON_SELECTED_NIGHTTOUR = new L.DivIcon({
                html: '',
                className: 'NON_SELECTED_NIGHTTOUR',
                iconSize: [49, 67],
            iconAnchor: [25, 67]
        });

        this.DONE_MISSION = L.icon({
            iconUrl: "images/DONE_MISSION.png",
            iconSize: [30, 42],
            iconAnchor: [15, 42],
        });
        this.DONE_NIGHTTOUR = L.icon({
            iconUrl: "images/DONE_NIGHTTOUR.png",
            iconSize: [30, 42],
            iconAnchor: [15, 42],
        });
        this.CONSULTATION = L.icon({
            iconUrl: "images/CONSULTATION.png",
            iconSize: [49, 67],
            iconAnchor: [25, 67],
        });
        this.GRAY_TARGET = L.icon({
            iconUrl: 'javascripts/vendors/images/target_gray.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });
        this.TARGET = L.icon({
            iconUrl: 'javascripts/vendors/images/target.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });
    };


    /**
     * @method
     * @memberOf    Icon
     * @desc        Retourne l'icône
     * @param       {string} name Nom de l'icône
     * @returns     {L.icon} Icône correspondant
     */
    Icon.prototype.get = function (name) {
        var icon = this[name] ;
        if(icon){
            return icon;
        } else {
            console.error('Icon '+name+' not available.');
        }
    };

    /**
     * @method
     * @memberOf    Icon
     * @desc        Retourne l'icône associée à l'okey demandé
     * @param       {string} okey
     * @returns     {L.icon} Icône correspondant
     */
    Icon.prototype.getOkeyIcon = function (okey, classindex) {

        classindex = classindex || 0 ;

        var icon = this['OKEY_'+okey+'_'+classindex] || L.icon({
            iconUrl: window.SMARTGEO_CURRENT_SITE.symbology[''+okey+classindex].style.symbol.icon,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        if(icon){
            return icon;
        } else {
            console.error('Icon not available.');
        }

    };

    return new Icon();
});
