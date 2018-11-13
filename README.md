# SmartgeoMobile

### **Rappel des version Android:**
**VersionName:** | **VersionCode** | **ReleaseDate** | **API Level**
------------ | ------------- | ------------- | -------------
Jelly Bean | 4.1 – 4.3.1 | 3.0.31 to 3.4.39 | July 9, 2012 | 16 – 18
KitKat | 4.4 – 4.4.4 | 3.10 | October 31, 2013 | 19 – 20
Lollipop | 5.0 – 5.1.1 | 3.16 | November 12, 2014 | 21 – 22
Marshmallow | 6.0 – 6.0.1 | 3.18 | October 5, 2015 | 23
Nougat | 7.0 – 7.1.2 | 4.4 | August 22, 2016 | 24 – 25
Oreo | 8.0 – 8.1 | 4.10 | August 21, 2017 | 26 – 27
Pie | 9.0 | 4.4.107, 4.9.84, and 4.14.42 | August 6, 2018 | 28

### **Dépendances:**

- Node.js et npm (latest):
	- https://nodejs.org

- Cordova (version 8.1.2):
	- npm install -g cordova@8.1.2

- Installer le(s) SDK-Android ainsi que les dépendances afin de pouvoir Build:
	- API level 26
	- https://developer.android.com/sdk/installing/index.html

- Installer ncp:
	- npm install ncp

----------

### **Configuration APK :**

Copier le fichier generic.config.js à la racine du dossier www/ et renommer le en config.js. Le descriptif des configurations est présent en commentaire dans ce fichier.

----------

### **Configuration Environnement**

#### **Ajouter un environnement android au projet**
```console
cordova platform add android@6.3.0
```

#### **Builder l'APK**
En mode debug pour autoriser les points d'arrêts et l'inspection de variables :
```console
cordova build android --debug
```

En mode production pour les livraisons client
```console
cordova build android --release
```

Les APK apparaissent dans le dossier suivant :
```console
/platform/android/build/output/apk/
```
Avec les noms suivants : **android-debug.apk** et **android-release.apk**

### **Exécution locale / poste de développement :**

Pour développer/debugger la partie Web dans Chrome, n'oubliez pas d'ajouter les flags : --disable-web-security --allow-file-access-from-files

Tous les processus Chrome doivent être terminés pour que ces modifs soient prises en compte.
