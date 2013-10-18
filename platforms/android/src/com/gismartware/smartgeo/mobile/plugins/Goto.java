package com.gismartware.smartgeo.mobile.plugins;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.content.Intent;
import android.net.Uri;

public class Goto extends CordovaPlugin {

	public Goto() {
	}

	@Override
	public boolean execute(String action, JSONArray arguments, final CallbackContext callbackContext) throws JSONException {
		if (action.equals("goto")) {
			String url = "https://maps.google.com/maps?saddr=" + arguments.getString(0) + "," + arguments.getString(1) 
					+ "&daddr=" + arguments.getString(2) + "," + arguments.getString(3);
			Intent intent = new Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url));
			this.cordova.getActivity().startActivity(intent);
			return true;
		}
		return false;
	}
}
