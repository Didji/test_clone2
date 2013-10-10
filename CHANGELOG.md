
0.9.0 / 2013-10-10
==================

* Closes #70.
* cordova polyfill
* add cordova related config.xml
* cordova deps
* Closes #117
* Closes #74.
* add spinner to report (closes #90)
* cancel url change does not uninstall site
* closes #114
* add spinner in search button (closes #91)
* Closes #95
* reset criteria value on criteria unselect (closes #83)
* Closes #3
* add 'Erase criteria' button in advanced search (closes #82)
* Closes #105
* consultation tirette do not appears when consultation panel is empty (closes #101)
* metamodels and activities binded to absent object are not installed (closes #62)
* points are now prioritary on linestrings (closes #68)
* closes #26
* closes #85
* site uninstall controller (closes #65)
* closes #96
* convert dropdown to dropup ! (closes #84)
* closes #109
* add media feature (closes #78)
* local saved report sync UI (closes #61)
* put install functions out of scope for better performances (closes #77)
* jointure on consultation attributes (closes #108)
* Advanced search mode (closes #52)
* Closes #107
* select2 results are visible (closes #106)
* Closes #93
* report are now saved locally if POST request fail (closes #60)
* report are now UUID'ed (close #73)
* Closes #102
* use setItem and getItem for localStorage
* resolve map freezing (closes #86)
* add unminified version of leaflet
* add weinre (pronounce weinery)
* Closes #100. Closes #99
* Attemps to solve consultation issue on Android.
* Closes #103
* split smartgeomobile.js file into multiple factory/*.js file
* Attemps to mitigate #86
* comment angular.copy() for testing (related to #77)
* extract DOM storage and DOM manipulation from mapController to G3ME object to avoid memory leak, this may cause some trouble
* add cordova
* Closes #87. Closes #88.
* Add a thingy to open consultation panel. Closes #40.
* Proposition de police Roboto (celle utilisée par Android pour s'approcher d'une appli native), à valider +@fabriceds)
* Closes #1.
* Closes #71
* Closes #80. Closes #58.
* fixes #76
* select2 message are now in french (closes #75)
* Closes #55
* Closes #69. Closes #59. Closes #56.
* consultation item should display a label, family or asset label) (closes #67)
* good collapse happening when resultset contains cables (closes #66)
* Closes #63. Closes #64.
* Search: advanced search ui with autocomplete (closes #36) and select2 (angular version) integration
* Search: display message when no item found (closes #53)
* window resize trigger map div resize (closes #41)
* Consultation: all marker are removed on dataset change (closes #51)
* Map: map state is save (on movend event), and restored each mapController load (closes #33)
* Search: simple search mode (closes #7)
* Report: only first tab is opened (close #5). This code part will change when configuration will be transmitted from GiMAP
* Consultation: assets are now grouped by okey (close #47)
* Enable/Disable consultation in menu closes left panel
* closing panel doesn't reset context (closes #46)
* ajout des boutons en haut du compte-rendu
* Closes #45
* Prettify report form. Closes #32.
* UI: allow user to scroll in left panel (close #44)
* Bring some beauty to the world. Closes #43, #42, #34
* map is now fullheight (closes #39)
* ajout d'un indicateur de consultation (close #31)
* Prettify login form. Closes #38.
* consultation close button is now pretty (close #30)
* les boutons btn-primary sont maintenants orange
* le bouton consultation active la consultation (refers #31), reste à mettre un voyant pour savoir si on est en constulation
* interface de la recherche avancée
* Pretify the installation page. Closes #28, #27
* consultation avec positionement des marqueurs sur le patrimoine
* fiche patrimoine dans des elements collapse
* vérification qu'au moins un champ a été rempli dans le formulaire
* debut du fonctionnement de la tirette
* Add font-awesome icons
* When the user can only access one site, autoload or autoinstall said site. Closes #2.
* Closes #25
* ajout de twitter bootstrap 3
* rajout de guillemets manquants (le JSON.parse() échouait)
* Authentification. Closes #23, #22, #21.
* fonction de localisation dans la consultation
* l'envoi des CR est maintenant fonctionnel
* récupération des objets entiers lors d'un CR avec objets prédéfinis (en prévision du remplissage des valeurs par défaut)
* les id des objets passés dans l'url sont automatiquement selectionnés dans le formulaire de compte-rendu (reportController)
* update angular 1.0.7 -> 1.2.0-rc.2
* Closes #4
* ajout du lien entre la consultation et le compte-rendu
* Ignore local Eclipse files
* detail du patrimoine dans le panneau de consultation
* menu consultation sur la droite sur l'evenement de consultation(click)
* Utilisation du css de leaflet contenu dans le dépôt au lieu du CDN
