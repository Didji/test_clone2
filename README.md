----------

# SmartgeoMobile

----------

### **Dépendances:**

- Node.js et npm:
	- https://nodejs.org

- Cordova:
	- npm install -g cordova

- Installer les sdk android et les dépendances afin de pouvoir Build:
	- https://developer.android.com/sdk/installing/index.html

- Installer ncp:
	- npm install ncp

----------

### **Configuration:**

- Dans le fichier config.js.template:
	- Oauth: true pour l'authentification google.
	- serverUrl: url du serveur smartgeo pour l'authentification oauth, lorsque le paramètre oauth est à true.
	- DONT_REALLY_RESET: true pour que les intents restent dans le localstorage lorsque l'utilisateur s'authentifie (Voir Utils.reset/setGimapUrl).

- Pour modifier le serverUrl sans avoir à regénérer l'apk, il faut ajouter le ficher Android/data/com.gismartware.mobile/files/app.properties contenant la clé server_url ayant pour valeur le serveur smartgeo désiré.

Exemple: server_url=http://smartgeo.domain.com

Note: Si l'appareil est doté d'une carte sd, le répertoire cible du fichier app.properties se trouvera dans celle ci.
Note 2: Lors de la suppression des données depuis le gestionnaire d'applications d'Android, ce fichier sera également supprimé et il faudra le recréer manuellement.

----------

**Android:** | **iOs:**
------------ | -------------
cordova platform add android | cordova platform add ios
cordova build android | cordova build ios
cordova run android --nobuild | cordova run ios --device --nobuild

----------

Le fork de la version entreprise du plugin sqlite:
	- [Cordova Sqlite Entreprise](https://github.com/Diliz/Cordova-sqlite-enterprise-free)

----------

### **Exécution locale / poste de développement :**

Pour développer/debugger la partie Web dans Chrome, n'oubliez pas d'ajouter les flags : --disable-web-security --allow-file-access-from-files

Tous les processus Chrome doivent être terminés pour que ces modifs soient prises en compte.
