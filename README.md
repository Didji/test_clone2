![GI](http://gismartware.com/images/logo.png)
====================================================================

## Installation d'un environnement de dev/test 

Prérequis : 
* nodejs & npm ([OSX](http://nodejs.org/dist/v0.10.24/node-v0.10.24.pkg)/[Windows](http://nodejs.org/dist/v0.10.24/node-v0.10.24-x86.msi))
* git ([OSX](https://git-osx-installer.googlecode.com/files/git-1.8.4.2-intel-universal-snow-leopard.dmg)/[Windows](https://msysgit.googlecode.com/files/Git-1.8.5.2-preview20131230.exe))
* compte github (http://github.com)

### Téléchargement des sources 

`git clone https://github.com/gismartwaredev/smartgeomobile`

### Lancement de smartgeomobile 

```bash
sudo npm install -g grunt-cli
cd smartgeomobile
npm install
grunt install 
grunt dev
```

### Lancement des tests smartgeomobile 

```bash 
grunt test
```

### Ouverture de Chrome avec l'option `--disable-web-security`

> Attention : Si Chrome est déjà lancé, l'option ne sera pas prise en compte. Veuillez donc vous assurer que Chrome n'est pas en cours avant de faire l'opération suivante.

* Pour Windows, ajoutez l'option au raccourcis bureau 
  - Click droit, propriété 
  - Ajoutez l'option après `chrome.exe`
  - Clickez sur l'icône
* Pour OSX
  - Dans le terminal : `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security`
