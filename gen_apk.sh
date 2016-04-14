#!/bin/bash

read -p 'Nombre de builds souhaitées : ' number
read -p 'Version de Smartgeo (exemple: 2.2.0-dev2): ' version
read -p 'En mode debug (y/n): ' debug

rm -Rf ./gen_apks
mkdir gen_apks
touch ./gen_apks/log && echo "" > log
touch ./gen_apks/log_errors && echo "" > log_errors

cordova platform rm android 2>> ./gen_apks/log_errors >> ./gen_apks/log
cordova platform add android 2>> ./gen_apks/log_errors >> ./gen_apks/log

for (( i = 1; i <= $number; i++ )); do
	if [[ $i = 1 ]]; then
		cordova build android > ./gen_apks/log
		if [[ $debug = 'y' ]]; then
			mv ./platforms/android/build/outputs/apk/android-debug.apk ./gen_apks/smartgeomobile-$version.apk
		else
			mv ./platforms/android/build/outputs/apk/android-debug.apk ./gen_apks/smartgeomobile-$version.apk
		fi
	else
		if [[ $i = 2 ]]; then
			sed -i 's/com.gismartware.mobile/com.gismartware.mobile_'"$i"'/' ./config.xml
			sed -i 's/<name>Smartgeo<\/name>/<name>Smartgeo_'"$i"'<\/name>/' ./config.xml
		else
			sed -i 's/com.gismartware.mobile_'$((i - 1))'/com.gismartware.mobile_'"$i"'/' ./config.xml
			sed -i 's/<name>Smartgeo_'$((i - 1))'<\/name>/<name>Smartgeo_'"$i"'<\/name>/' ./config.xml
		fi
		cordova platform rm android 2>> ./gen_apks/log_errors >> ./gen_apks/log
		cordova platform add android 2>> ./gen_apks/log_errors >> ./gen_apks/log

		if [[ $debug = 'y' ]]; then
			cordova build android 2>> ./gen_apks/log_errors >> ./gen_apks/log
			mv ./platforms/android/build/outputs/apk/android-debug.apk ./gen_apks/smartgeomobile-$version-$i.apk
		else
			cordova build android --release 2>> ./gen_apks/log_errors >> ./gen_apks/log
			mv ./platforms/android/build/outputs/apk/android-release.apk ./gen_apks/smartgeomobile-$version-$i.apk
		fi
	fi
done

sed -i 's/com.gismartware.mobile_'"$number"'/com.gismartware.mobile/' ./config.xml 2>> ./gen_apks/log_errors
sed -i 's/<name>Smartgeo_'"$number"'<\/name>/<name>Smartgeo<\/name>/' ./config.xml 2>> ./gen_apks/log_errors

cordova platform rm android 2>> ./gen_apks/log_errors >> ./gen_apks/log

cordova platform add android 2>> ./gen_apks/log_errors >> ./gen_apks/log

echo "Les $number apks générées sont dans le dossier gen_apks"