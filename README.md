![GI](http://gismartware.com/images/logo.png) smartgeomobile
======================

## Test & développement

##### Windows

* Téléchargement des sources générales : `git clone https://github.com/gismartwaredev/smartgeomobile`
* Téléchargez le dépôt windows : `git clone https://github.com/gismartwaredev/smartgeomobile-windows`
* Copiez les sources générales dans le répértoire `app/` du dépôt windows : `cp -R smartgeomobile/app smargeomobile-windows/` (`index.html` doit se trouver dans le répértoire `smartgeomobile-windows/app/`)
* Executer `smartgeomobile.exe` ou `smartgeomobile.bat`

##### Unix

* Téléchargement des sources générales : `git clone https://github.com/gismartwaredev/smartgeomobile`
* Installer Chrome
* Dans le terminal :
```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome      --disable-web-security \
                                                                    --unlimited-storage \
                                                                    --allow-file-access \
                                                                    --allow-file-access-from-files \
                                                                    --app="$PWD/smartgeomobile/app/index.html"  \
                                                                    --user-data-dir="$PWD/smartgeomobile/data"
```

## Livraison  :shipit:

##### Android

```
usage: ./android-build options

OPTIONS:
   -h      display help
   -t      git tag              [default: current commit]
   -i      install on terminal  [default: false]
   -m      release or debug     [default: debug]
   -u      upload to github     [default: false]
```

**_Notes_** :
  * Le script n'est disponible que sur Unix pour l'instant. `nodejs` et `curl` doivent être installés.
  * Pour utiliser l'option `-u`, la release doit être créée sur github et ne doit pas avoir d'APK uploadé avec ce script
  * Les APK `release` seront signés
  * Les APK `release` et `debug` seront alignés
  * Si un tag est fourni via l'option `-t`, un `git checkout` sera effectué, assurez vous donc de travailler sur un dépôt clean.

##### iOS

> TODO

##### Windows

> Voir https://github.com/gismartwaredev/smartgeomobile-windows/blob/master/README.md