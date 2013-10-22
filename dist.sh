#/bin/sh

# SUPPRESSION DE L'ANCIENNE DISTRIBUTION
rm -rf dist/


# CREATION DE LA STRUCTURE DE LA DISTRIBUTION
mkdir dist/
mkdir dist/javascripts/
mkdir dist/javascripts/vendors
cp -R javascripts/vendors/ dist/javascripts/vendors
cp -R css/ dist/css/
cp -R fonts/ dist/fonts/
cp -R images/ dist/images/
cp -R partials/ dist/partials/
cp index.dist.html dist/index.html

# GENERATION DU SCRIPT DE DISTRIBUTION
# cat  javascripts/vendors/*.js > smartgeomobile.cat.vendors.js


cat  javascripts/smartgeomobile.js javascripts/factory/* javascripts/controllers/* >  smartgeomobile.cat.js
ngmin smartgeomobile.cat.js smartgeomobile.annotated.js
# cat smartgeomobile.cat.vendors.js >> smartgeomobile.annotated.js
java -jar compiler.jar --js smartgeomobile.annotated.js --js_output_file dist/javascripts/smartgeomobile.js
# --language_in ES5 --compilation_level ADVANCED_OPTIMIZATIONS
# uglifyjs smartgeomobile.closure.js > dist/javascripts/smartgeomobile.js
# cp smartgeomobile.closure.js dist/javascripts/smartgeomobile.js


# SUPPRESSION DES FICHIERS TEMPORAIRES
rm smartgeomobile.cat.js
# rm smartgeomobile.cat.vendors.js
rm smartgeomobile.annotated.js
rm smartgeomobile.closure.js

