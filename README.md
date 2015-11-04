# smartgeomobile

Android Cordova Webview Upgrade

Cloner la branche:

git clone -b android-cordova-webview https://github.com/gismartwaredev/smartgeomobile.git


Il faut les dépendances suivantes:

Node.js et npm: 

https://nodejs.org (le package installera npm avec)

Cordova:

npm install -g cordova

Installer les sdk android et les dépendances pour pouvoir Build:

https://developer.android.com/sdk/installing/index.html

Il faut ncp pour la copie des assets pour ensuite pouvoir build (en local):

npm install ncp

Build sur android ou sur émulateur:

cordova platform add android

cordova run android (ou cordova build android)

Si le build marche mais que l'installation ne marche pas, désinstaller l'application du téléphone et faite:

cordova run android --nobuild

Les forks du plugin sqlite:

Le plugin normal: https://github.com/Diliz/Cordova-sqlite-storage
La version entreprise: https://github.com/Diliz/Cordova-sqlite-enterprise-free