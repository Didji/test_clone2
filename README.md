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

Il semblerait que lorsqu'on add la platform Android cela provoque une erreur et nous dit que le module ncp n'est pas présent, à installer en local car ne fonctionne pas en global (pour une raison inconnue encore):

npm install ncp

Build sur android ou sur émulateur:

cordova platform add android

cordova run android (ou cordova build android)
