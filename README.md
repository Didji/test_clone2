
![GI](http://gismartware.com/images/logo.png)
====================================================================

### Install android sdk 

Download it from : http://developer.android.com/sdk/

Then you need to install a hardware specific target : 
* For Samsung galaxy S3 : API 17 (for Android 4.2)
* For others, complete this list.

You can download and install it from Android SDK manager

If your SDK Manager doesn't work you can launch it from :
* Eclipse plugin (if it's installed)
* Android Custom Eclipse (downloaded with Android SDK Manager, you can find it in `sdk-android/eclipse/eclipse`

PS: don't forget to set environment variables (**ANDROID_HOME**, **ANDROID_BIN**)

### Install nodejs

Download package from : http://nodejs.org/

### Install cordova via npm

`npm install -g cordova`

### Get this project 

Clone **recursively** this repository : 

`git clone --recursive https://github.com/gismartwaredev/smartgeomobile-cordova.git`

### Build project and deploy it to hardware

`cordova -d prepare && cordova -d build && cordova -d run`


