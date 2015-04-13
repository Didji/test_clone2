Intents
-------

### Test des Intents sur un terminal Android

`adb shell 'am start -a android.intent.action.VIEW -c android.intent.category.DEFAULT -d "gimap://URL_INTENT"'

#### Exemple
* OI (avec id mission) :
    * sur équipement : ```adb shell 'am start -a android.intent.action.VIEW -c android.intent.category.DEFAULT -d "gimap://map/view?target=2407301&activity=496410&marker=true&mission=342566&zoom=16&redirect=https%3A%2F%2Fwww.google.fr"'```
    * sur X,Y : ```adb shell 'am start -a android.intent.action.VIEW -c android.intent.category.DEFAULT -d "gimap://map/view?target=45.80307994417619,4.773500561714172&activity=496410&marker=true&mission=342566zoom=16&redirect=https%3A%2F%2Fwww.google.fr"'```
    * sur X,Y et équipement : ```adb shell 'am start -a android.intent.action.VIEW -c android.intent.category.DEFAULT -d "gimap://map/view?target=2407301%3B45.80307994417619,4.773500561714172&activity=496410&marker=true&mission=342566zoom=16&redirect=https%3A%2F%2Fwww.google.fr"'```


### Test des Intents sur Chrome Bureau

* OI (avec id mission) :
    * [sur équipement](http://localhost:12345/#/intent/map?map_target=2407301&report_target=2407301&map_marker=true&report_activity=496410&map_activity=496410&map_zoom=18&report_mission=12345&report_url_redirect=https:%2F%2Fgoogle.fr)
    * [sur X,Y](http://localhost:12345/#/intent/map?map_target=45.80307994417619,4.773500561714172&report_target=45.80307994417619,4.773500561714172&map_marker=true&report_activity=496410&map_activity=496410&map_zoom=18&report_mission=12345&report_url_redirect=https:%2F%2Fgoogle.fr)
    * [sur X,Y et équipement](http://localhost:12345/#/intent/map?map_target=2407301%3B45.80307994417619,4.773500561714172&report_target=2407301%3B45.80307994417619,4.773500561714172&map_marker=true&report_activity=496410&map_activity=496410&map_zoom=18&report_mission=12345&report_url_redirect=https:%2F%2Fgoogle.fr)

* RI (sans id mission) :
    * [sur équipement](http://localhost:12345/#/intent/map?map_target=2407301&report_target=2407301&map_marker=true&report_activity=496410&map_activity=496410&map_zoom=18&report_url_redirect=https:%2F%2Fgoogle.fr)
    * [sur X,Y](http://localhost:12345/#/intent/map?map_target=45.80307994417619,4.773500561714172&report_target=45.80307994417619,4.773500561714172&map_marker=true&report_activity=496410&map_activity=496410&map_zoom=18&report_url_redirect=https:%2F%2Fgoogle.fr)
    * [sur X,Y et équipement](http://localhost:12345/#/intent/map?map_target=2407301%3B45.80307994417619,4.773500561714172&report_target=2407301%3B45.80307994417619,4.773500561714172&map_marker=true&report_activity=496410&map_activity=496410&map_zoom=18&report_url_redirect=https:%2F%2Fgoogle.fr)


NB: Pour voir les correspondances qui permettent de faire la traduction en URL de type gimap:// et http://, se reporter au fichier https://github.com/gismartwaredev/smartgeomobile/blob/dev/platforms/android/content-shell/src/com/gismartware/mobile/config.properties
