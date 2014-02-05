Integration continue
====================

Configuration (à la racine du projet) : 
* `cp test/build-* .git/hooks/`
* `npm install`
* `grunt install`
* `git config --add concrete.runner "grunt test"`
* `git config --add concrete.branch dev`

Lancement de concrete : 
* `node_modules/concrete/bin/concrete .`
