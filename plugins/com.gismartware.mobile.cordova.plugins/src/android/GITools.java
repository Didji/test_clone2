package com.gismartware.mobile.cordova.plugins;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;


public class GITools extends CordovaPlugin {

	private static final String LOG_TAG = "GITools";

	@Override
	public boolean execute(String action, JSONArray args, CallbackContext callbackCtx) throws JSONException {
		boolean result;

		if ("navigate".equals(action)) {
			return this.navigate(args);
		}
		return false;
	}

	private boolean navigate(JSONArray args) {
		boolean result;
		try {
			JSONArray pos = args.getJSONArray(0);
			String lat = pos.getString(0);
        	String lon = pos.getString(1);
			if (lat == null || lat.length() == 0 || lon == null || lon.length() == 0) {
            	Log.e(LOG_TAG, "Expected two non-empty string arguments for destination lat/lon.");
				return false;
            }

			String url = "https://maps.google.com/maps?daddr=" + lat + "," + lon;

			if (args.length() == 2) {
				Log.d(LOG_TAG, "start trouvé");
				pos = args.getJSONArray(1);
				lat = pos.getString(0);
	        	lon = pos.getString(1);
				if (lat == null || lat.length() == 0 || lon == null || lon.length() == 0) {
					Log.e(LOG_TAG, "Expected two non-empty string arguments for start lat/lon.");
					return false;
	            }
				url += "&saddr=" + lat + "," + lon;
			}

			Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
			this.cordova.getActivity().startActivity(intent);
			result = true;
		} catch (JSONException e) {
			Log.e(LOG_TAG, "Exception occurred: " + e.getMessage());
        	result = false;
		}
        return result;
    }
}