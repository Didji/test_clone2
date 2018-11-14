angular.module("smartgeomobile.config", []).constant("RIGHTS", {
    /**
     *  Modules
     *  @desc : Ces modules sont activé via le menuController
     *          Chaque module est accessible via un lien dans le menu général de gauche
     */
    // Ajout / suppression / modification du patrimoine
    census: false,
    // Permet de visualiser les OT et les appels affectés à l'utilisateur connecté
    planning: false,
    // gestion des projets
    project: false,
    // Outil de recherche de patrimoine
    search: true,
    // Gestion de l'affichage des couches cartographique
    activelayers: true,
    // Outil de synchronisation des comptes rendus
    synccenter: true,
    // Outil de mise à jour de cache référentiel / désinstallation du site
    parameters: true,

    /**
     *  Fonctionnalités
     *  @desc : Ajoute des fonctionnalités aux modules
     */
    // Visualisation d'un' historique des rapports (accessible depuis la fiche d'un patrimoine)
    history: false,
    // Permet de localiser cartographiquement un patrimoine depuis sa fiche
    goto: true,
    // Retour a la page de login
    logout: false,
    // ???
    media: true,
    // ???
    photo: true,
    // Selection cartographique de patrimoine via un touch sur la carte
    consultation: true,
    // Ajout un patrimoine dans le panier de selection directement depuis sa fiche
    multiselection: false,
    // Localise la derniere position connue du GPS
    myposition: true,
    // Création d'un compte rendu depuis la fiche d'un patrimoine
    report: false,
    // Permet de se connecter à un autre site sans désinstallation du site courrant
    siteselection: false,

    /**
     *  Paramètres généraux
     *  @desc : paramètre systeme
     */
    // Détermine si les tuiles sont récupérées depuis le serveur ou le cache mobilité
    downloadTiles: true,
    // A l'ouverture de la carte permet d'automatiquement déclencher une MAJ (dans la limite d'une fois par jour)
    onlyUpdateSiteDaily: true,
    // Activation de l'OAuth (plus de menu de login)
    oauth: true,
    // Adresse du serveur smartgeo (uniquement si oauth: true)
    serverUrl: "http://rec3-canopee-frontal.hp.m-ve.com/",
    //serverUrl: "http://canopee-mobile.m-ve.com/",
    //serverUrl: "http://dev-canopee-frontal.hp.m-ve.com/",
    // ???
    intent: 200,
    // Active le service FileLogger et la création d'un fichier de log
    // par défaut le fichier est stocké : Android/data/com.gismartware.mobile/cache/smartgemobile.txt
    debug: false,
    // Limite du nombre de photo jointe à un CR
    _MAX_MEDIA_PER_REPORT: 3,
    /* Limite de taille des images CR
     *       => exprimée en bytes
     *       => il s'agit de la taille compressé
     *       => il s'agit de la taille compressé => 200kBytes
     */
    _MAX_SIZE_IMG_POST_REQ: 200000,
    // true pour que les intents restent dans le localstorage lorsque l'utilisateur s'authentifie (Voir Utils.reset/setGimapUrl).
    _DONT_REALLY_RESET: false
});
