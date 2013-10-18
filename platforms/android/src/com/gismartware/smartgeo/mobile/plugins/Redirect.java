package com.gismartware.smartgeo.mobile.plugins;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

public class Redirect extends CordovaPlugin {

	public Redirect() {
	}

	@Override
	public boolean execute(String action, JSONArray arguments, final CallbackContext callbackContext) throws JSONException {
		if (action.equals("redirect")) {
			String url = arguments.getString(0);
          	Log.d("RedirectPlugin", "Loading " + url);
			Intent intent = new Intent(android.content.Intent.ACTION_VIEW,  Uri.parse(url)).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK|Intent.FLAG_ACTIVITY_NEW_TASK);
			this.cordova.getActivity().startActivity(intent);
			return true;
		}
		return false;
	}
}
